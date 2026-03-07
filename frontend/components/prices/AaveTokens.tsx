type AaveTokenRow = {
  id: string;
  name: string;
  symbol: string;
  decimals: string;
};

type AaveRewardTokenRow = {
  id: string;
  token: {
    id: string;
  };
  type: string;
  _distributionEnd: string;
};

type AaveTokensProps = {
  tokens: AaveTokenRow[];
  rewardTokens: AaveRewardTokenRow[];
};

export default function AaveTokens({ tokens, rewardTokens }: AaveTokensProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        Aave Tokens
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">ID</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Name</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Symbol</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Decimals</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr
                key={token.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{token.id}</td>
                <td className="py-2 text-zinc-900 dark:text-zinc-100">{token.name}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{token.symbol}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{token.decimals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        Aave Reward Tokens
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">ID</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Token</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">Type</th>
              <th className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                Distribution End
              </th>
            </tr>
          </thead>
          <tbody>
            {rewardTokens.map((rewardToken) => (
              <tr
                key={rewardToken.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{rewardToken.id}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {rewardToken.token.id}
                </td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{rewardToken.type}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">
                  {rewardToken._distributionEnd}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { AaveTokenRow, AaveRewardTokenRow };
