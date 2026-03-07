// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "openzeppelin-contracts/utils/introspection/IERC165.sol";

import {GMXExecutor} from "../src/strategy/GMXExecutor.sol";
import {IReceiver} from "../src/strategy/interfaces/IReceiver.sol";

contract GMXExecutorTest is Test {
    GMXExecutor internal executor;

    address internal constant ROUTER = address(0x1001);
    address internal constant ROUTER_SPENDER = address(0x1002);
    address internal constant FORWARDER = address(0xF0F0);

    address internal constant ATTACKER = address(0xBEEF);
    address internal constant NEW_OWNER = address(0xCAFE);

    function setUp() public {
        executor = new GMXExecutor(ROUTER, ROUTER_SPENDER, FORWARDER);
    }

    function testConstructorRevertsWhenRouterZero() public {
        vm.expectRevert(GMXExecutor.InvalidRouter.selector);
        new GMXExecutor(address(0), ROUTER_SPENDER, FORWARDER);
    }

    function testConstructorRevertsWhenRouterSpenderZero() public {
        vm.expectRevert(GMXExecutor.InvalidRouterSpender.selector);
        new GMXExecutor(ROUTER, address(0), FORWARDER);
    }

    function testConstructorSetsOwnerAndForwarder() public view {
        assertEq(executor.owner(), address(this));
        assertEq(executor.creForwarder(), FORWARDER);
    }

    function testSetOwnerRestrictionsAndUpdate() public {
        vm.prank(ATTACKER);
        vm.expectRevert(GMXExecutor.NotOwner.selector);
        executor.setOwner(NEW_OWNER);

        vm.expectRevert(bytes("OWNER_ZERO"));
        executor.setOwner(address(0));

        executor.setOwner(NEW_OWNER);
        assertEq(executor.owner(), NEW_OWNER);
    }

    function testSetCreConfigOnlyOwner() public {
        vm.prank(ATTACKER);
        vm.expectRevert(GMXExecutor.NotOwner.selector);
        executor.setCreForwarder(address(0x1111));

        vm.prank(ATTACKER);
        vm.expectRevert(GMXExecutor.NotOwner.selector);
        executor.setCreWorkflowId(bytes32(uint256(123)));

        vm.prank(ATTACKER);
        vm.expectRevert(GMXExecutor.NotOwner.selector);
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

    function testSetCreOrderConfigValidation() public {
        GMXExecutor.CreOrderConfig memory cfg = _baseConfig();

        cfg.orderVault = address(0);
        vm.expectRevert(GMXExecutor.InvalidCreOrderVault.selector);
        executor.setCreOrderConfig(cfg);

        cfg = _baseConfig();
        cfg.executionFee = 0;
        vm.expectRevert(GMXExecutor.InvalidCreExecutionFee.selector);
        executor.setCreOrderConfig(cfg);
    }

    function testOnReportRevertsIfSenderIsNotForwarder() public {
        vm.prank(ATTACKER);
        vm.expectRevert(
            abi.encodeWithSelector(GMXExecutor.InvalidCreSender.selector, ATTACKER, FORWARDER)
        );
        executor.onReport("", hex"00");
    }

    function testOnReportRevertsOnInvalidMarket() public {
        bytes memory report = abi.encode(
            uint8(0),
            address(0xA11CE),
            address(0),
            uint256(1e18),
            uint256(1e30),
            uint256(2e30),
            uint256(2e30)
        );

        vm.prank(FORWARDER);
        vm.expectRevert(GMXExecutor.InvalidCreMarket.selector);
        executor.onReport("", report);
    }

    function testOnReportRevertsOnInvalidActionAfterConfig() public {
        executor.setCreOrderConfig(_baseConfig());

        bytes memory report = abi.encode(
            uint8(99),
            address(0xA11CE),
            address(0xB0B),
            uint256(1e18),
            uint256(1e30),
            uint256(2e30),
            uint256(2e30)
        );

        vm.prank(FORWARDER);
        vm.expectRevert(abi.encodeWithSelector(GMXExecutor.InvalidCreAction.selector, uint8(99)));
        executor.onReport("", report);
    }

    function testSupportsInterfaceReturnsTrueForReceiverAndErc165() public view {
        assertTrue(executor.supportsInterface(type(IReceiver).interfaceId));
        assertTrue(executor.supportsInterface(type(IERC165).interfaceId));
    }

    function _baseConfig() internal pure returns (GMXExecutor.CreOrderConfig memory cfg) {
        cfg.orderVault = address(0x1111);
        cfg.cancellationReceiver = address(0x2222);
        cfg.callbackContract = address(0x3333);
        cfg.uiFeeReceiver = address(0x4444);
        cfg.executionFee = 1;
        cfg.callbackGasLimit = 0;
        cfg.minOutputAmount = 0;
        cfg.validFromTime = 0;
        cfg.shouldUnwrapNativeToken = false;
        cfg.autoCancel = false;
        cfg.referralCode = bytes32(0);
        cfg.closeIsLong = false;
    }
}
