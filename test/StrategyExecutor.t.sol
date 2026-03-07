// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "openzeppelin-contracts/utils/introspection/IERC165.sol";

import {IReceiver} from "../src/strategy/interfaces/IReceiver.sol";
import {StrategyExecutor} from "../src/strategy/StrategyExecutor.sol";
import {OperationType} from "../src/strategy/StrategyTypes.sol";

contract StrategyExecutorTest is Test {
    StrategyExecutor internal executor;

    address internal constant UNISWAP_ROUTER = address(0x1001);
    address internal constant SUSHI_ROUTER = address(0x1002);
    address internal constant AAVE_POOL = address(0x1003);
    address internal constant FORWARDER = address(0xF0F0);

    address internal constant ATTACKER = address(0xBEEF);
    address internal constant NEW_OWNER = address(0xCAFE);

    function setUp() public {
        executor = new StrategyExecutor(UNISWAP_ROUTER, SUSHI_ROUTER, AAVE_POOL, FORWARDER);
    }

    function testConstructorSetsOwnerAndForwarder() public view {
        assertEq(executor.owner(), address(this));
        assertEq(executor.creForwarder(), FORWARDER);
    }

    function testSetOwnerRevertsWhenNotOwner() public {
        vm.prank(ATTACKER);
        vm.expectRevert(StrategyExecutor.NotOwner.selector);
        executor.setOwner(NEW_OWNER);
    }

    function testSetOwnerRevertsOnZeroAddress() public {
        vm.expectRevert(bytes("OWNER_ZERO"));
        executor.setOwner(address(0));
    }

    function testSetOwnerUpdatesOwner() public {
        executor.setOwner(NEW_OWNER);
        assertEq(executor.owner(), NEW_OWNER);
    }

    function testSetCreConfigOnlyOwner() public {
        vm.prank(ATTACKER);
        vm.expectRevert(StrategyExecutor.NotOwner.selector);
        executor.setCreForwarder(address(0x1111));

        vm.prank(ATTACKER);
        vm.expectRevert(StrategyExecutor.NotOwner.selector);
        executor.setCreWorkflowId(bytes32(uint256(123)));

        vm.prank(ATTACKER);
        vm.expectRevert(StrategyExecutor.NotOwner.selector);
        executor.setCreWorkflowOwner(address(0x2222));
    }

    function testSetCreConfigUpdatesState() public {
        executor.setCreForwarder(address(0x1111));
        executor.setCreWorkflowId(bytes32(uint256(123)));
        executor.setCreWorkflowOwner(address(0x2222));

        assertEq(executor.creForwarder(), address(0x1111));
        assertEq(executor.creWorkflowId(), bytes32(uint256(123)));
        assertEq(executor.creWorkflowOwner(), address(0x2222));
    }

    function testOnReportRevertsIfSenderIsNotForwarder() public {
        vm.prank(ATTACKER);
        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutor.InvalidCreSender.selector, ATTACKER, FORWARDER)
        );
        executor.onReport("", hex"00");
    }

    function testOnReportRevertsOnInvalidReportLength() public {
        vm.prank(FORWARDER);
        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutor.InvalidCreReportLength.selector, uint256(1))
        );
        executor.onReport("", hex"00");
    }

    function testOnReportRevertsOnInvalidOperation() public {
        bytes memory report = abi.encode(uint8(99), uint256(1e18), uint256(1e6), address(0x1234));

        vm.prank(FORWARDER);
        vm.expectRevert(
            abi.encodeWithSelector(
                StrategyExecutor.InvalidCreOperation.selector,
                uint8(99)
            )
        );
        executor.onReport("", report);
    }

    function testSupportsInterfaceReturnsTrueForReceiverAndErc165() public view {
        assertTrue(executor.supportsInterface(type(IReceiver).interfaceId));
        assertTrue(executor.supportsInterface(type(IERC165).interfaceId));
    }

    function testExecuteRevertsOnInvalidOperation() public {
        OperationType invalidOp = OperationType(uint8(99));
        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutor.InvalidOperation.selector, uint8(99))
        );
        executor.execute(invalidOp, new Action[](0));
    }
}

// Import at end to keep test file readable.
import {Action} from "../src/strategy/StrategyTypes.sol";
