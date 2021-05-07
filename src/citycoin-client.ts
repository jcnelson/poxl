import { Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.6.0/index.ts';

//used only for better intellisense 
export interface Result {
  session_id: number,
  result: string
  events: []
}

export class CityCoinClient {
  contractName: string = "citycoin"
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account) {
    this.chain = chain;
    this.deployer = deployer;
  }

  private callReadOnlyFn(method: string, args: Array<any> = [], sender: Account = this.deployer): Result {
    const result = this.chain.callReadOnlyFn(
      this.contractName,
      method,
      args,
      sender?.address
    );

    return result;
  }

  /**
   * Mints token to make testing easier.
   * 
   * @param amount 
   * @param recipient 
   */
  ftMint(amount: number, recipient: Account) {
    const block = this.chain.mineBlock([
      Tx.contractCall(
        this.contractName,
        "ft-mint",
        [
          types.uint(amount),
          types.principal(recipient.address)
        ],
        this.deployer.address
      )
    ]);
  }

  // read only functions

  getCoinbaseAmount(stacksBlockHeight: number): Result {
    return this.callReadOnlyFn("get-coinbase-amount", [
      types.uint(stacksBlockHeight)
    ]);
  }

  getMinersAtBlock(stacksBlockHeight: number): Result {
    return this.callReadOnlyFn("get-miners-at-block", [
      types.uint(stacksBlockHeight)
    ]);
  }

  getStackedInCycle(miner: Account, rewardCycle: number): Result {
    return this.callReadOnlyFn("get-stacked-in-cycle", [
      types.principal(miner.address),
      types.uint(rewardCycle)
    ]);
  }

  getTokensPerCycle(rewardCycle: number): Result {
    return this.callReadOnlyFn("get-tokens-per-cycle", [
      types.uint(rewardCycle)
    ]);
  }

  getPoxLiteInfo(): Result {
    return this.callReadOnlyFn("get-pox-lite-info");
  }

  getBlockCommitTotal(): Result {
    throw Error("not implemented");
  }

  getBlockWinner(): Result {
    throw Error("not implemented");
  }

  hasMinedInList(): Result {
    throw Error("not implemented");
  }

  canClaimTokens(): Result {
    throw Error("not implemented");
  }

  canMineTokens(): Result {
    throw Error("not implementes");
  }

  canStackTokens(): Result {
    throw Error("not implemented");
  }

  getEntitledStackingReward(): Result {
    throw Error("not implemented");
  }

  getRewardCycle(): Result {
    throw Error("not implemented");
  }

  getFirstBlockHeightInRewardCycle(): Result {
    throw Error("not implemented");
  }

  getRandomUintAtBlock(): Result {
    throw Error("not implemented");
  }

  // public functions

  stackTokens(amountTokens: number, startStacksHeight: number, lockPeriod: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "stack-tokens",
      [
        types.uint(amountTokens),
        types.uint(startStacksHeight),
        types.uint(lockPeriod)
      ],
      sender.address
    );
  }

  mineTokens(amountUstx: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "mine-tokens",
      [
        types.uint(amountUstx)
      ],
      sender.address
    );
  }

  claimTokenReward(minedStacksBlockHeight: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "claim-token-reward",
      [
        types.uint(minedStacksBlockHeight)
      ],
      sender.address
    );
  }

  claimStackingRewad() {
    throw Error("not implemented");
  }

  
  // SIP-010 functions

  transfer(amount: number, from: Account, to: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName, 
      "transfer",
      [
        types.uint(amount),
        types.principal(from.address),
        types.principal(to.address)
      ],
      sender.address
    );
  }

  getName(): Result {
    return this.callReadOnlyFn("get-name");
  }

  getSymbol(): Result {
    return this.callReadOnlyFn("get-symbol");
  }

  getDecimals(): Result {
    return this.callReadOnlyFn("get-decimals");
  }

  getBalanceOf(user: Account): Result {
    return this.callReadOnlyFn("get-balance-of", [
      types.principal(user.address)
    ])
  }

  getTotalSupply(): Result {
    return this.callReadOnlyFn("get-total-supply");
  }

  getTokenUri(): Result {
    return this.callReadOnlyFn("get-token-uri");
  }
}