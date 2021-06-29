import { Tx, Account, types, ReadOnlyFn } from "../deps.ts";
import { Client } from "./client.ts";

export enum ErrCode {
  ERR_NO_WINNER = 0,
  ERR_NO_SUCH_MINER,
  ERR_IMMATURE_TOKEN_REWARD,
  ERR_UNAUTHORIZED,
  ERR_ALREADY_CLAIMED,
  ERR_STACKING_NOT_AVAILABLE,
  ERR_CANNOT_STACK,
  ERR_INSUFFICIENT_BALANCE,
  ERR_ALREADY_MINED,
  ERR_ROUND_FULL,
  ERR_NOTHING_TO_REDEEM,
  ERR_CANNOT_MINE,
  ERR_MINER_ALREADY_REGISTERED,
  ERR_MINING_ACTIVATION_THRESHOLD_REACHED,
  ERR_MINER_ID_NOT_FOUND,
  ERR_TOO_SMALL_COMMITMENT,
  ERR_CYCLE_NOT_COMPLETED,
}

export const MINING_HALVING_BLOCKS = 210000;
export const MINING_ACTIVATION_DELAY = 150;
export const FIRST_STACKING_BLOCK = 1 + MINING_ACTIVATION_DELAY;
export const REWARD_CYCLE_LENGTH = 2100;
export const CITY_CUSTODIED_WALLET = "STRKQ271SRDWB166VNV4FMXPH3X35YPQ5N192EWN";
export const SPLIT_STACKER_PERCENTAGE = 0.7;
export const SPLIT_CITY_PERCENTAGE = 0.3;
export const TOKEN_REWARD_MATURITY = 100;

export class CityCoinClient extends Client {
  setMiningActivationThreshold(newThreshold: number): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-mining-activation-threshold",
      [types.uint(newThreshold)],
      this.deployer.address
    );
  }

  // read only functions

  getCoinbaseAmount(stacksBlockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-coinbase-amount", [
      types.uint(stacksBlockHeight),
    ]);
  }

  getMinersAtBlock(stacksBlockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-miners-at-block", [
      types.uint(stacksBlockHeight),
    ]);
  }

  getTokensPerCycle(rewardCycle: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-tokens-per-cycle", [
      types.uint(rewardCycle),
    ]);
  }

  getPoxLiteInfo(): ReadOnlyFn {
    return this.callReadOnlyFn("get-pox-lite-info");
  }

  getBlockCommitTotal(stacksBlockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-block-commit-total", [
      types.uint(stacksBlockHeight),
    ]);
  }

  getBlockCommitToStackers(stacksBlockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-block-commit-to-stackers", [
      types.uint(stacksBlockHeight),
    ]);
  }

  getBlockCommitToCity(stacksBlockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-block-commit-to-city", [
      types.uint(stacksBlockHeight),
    ]);
  }

  getBlockWinner(
    stacksBlockHeight: number,
    randomSampleUint: number
  ): ReadOnlyFn {
    return this.callReadOnlyFn("get-block-winner", [
      types.uint(stacksBlockHeight),
      types.uint(randomSampleUint),
    ]);
  }

  generateMinerId(miner: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "generate-miner-id",
      [types.principal(miner.address)],
      this.deployer.address
    );
  }

  getMinerId(miner: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-miner-id", [
      types.principal(miner.address),
    ]);
  }

  getMinerIdNum(miner: Account): number {
    const result = this.callReadOnlyFn("get-miner-id", [
      types.principal(miner.address),
    ]).result;

    const regex = /\(some u(\d+)\)/g;
    const match = regex.exec(result);
    const minerId = !match ? 1 : match[1];

    return Number(minerId);
  }

  hasMined(miner: Account, blockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("has-mined", [
      types.uint(this.getMinerIdNum(miner)),
      types.uint(blockHeight),
    ]);
  }

  canClaimTokens(
    claimer: Account,
    claimerStacksBlockHeight: number,
    randomSample: number,
    minedBlock: MinedBlock,
    currentStacksBlock: number
  ): ReadOnlyFn {
    return this.callReadOnlyFn("can-claim-tokens", [
      types.principal(claimer.address),
      types.uint(claimerStacksBlockHeight),
      types.uint(randomSample),
      minedBlock.convert(),
      types.uint(currentStacksBlock),
    ]);
  }

  canMineTokens(
    miner: Account,
    minerId: number,
    stacksBlockHeight: number,
    amountUstx: number
  ): ReadOnlyFn {
    return this.callReadOnlyFn("can-mine-tokens", [
      types.principal(miner.address),
      types.uint(minerId),
      types.uint(stacksBlockHeight),
      types.uint(amountUstx),
    ]);
  }

  canStackTokens(
    stacker: Account,
    amountTokens: number,
    nowStacksHeight: number,
    startStacksHeight: number,
    lockPeriod: number
  ): ReadOnlyFn {
    return this.callReadOnlyFn("can-stack-tokens", [
      types.principal(stacker.address),
      types.uint(amountTokens),
      types.uint(nowStacksHeight),
      types.uint(startStacksHeight),
      types.uint(lockPeriod),
    ]);
  }

  getStackingReward(stacker: Account, targetRewardCycle: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-stacking-reward", [
      types.principal(stacker.address),
      types.uint(targetRewardCycle),
    ]);
  }

  getRewardCycle(stacksBlockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-reward-cycle", [
      types.uint(stacksBlockHeight),
    ]);
  }

  getFirstBlockHeightInRewardCycle(rewardCycle: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-first-block-height-in-reward-cycle", [
      types.uint(rewardCycle),
    ]);
  }

  getRandomUintAtBlock(stacksBlock: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-random-uint-at-block", [
      types.uint(stacksBlock),
    ]);
  }

  // public functions

  stackTokens(
    amountTokens: number,
    startStacksHeight: number,
    lockPeriod: number,
    sender: Account
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "stack-tokens",
      [
        types.uint(amountTokens),
        types.uint(startStacksHeight),
        types.uint(lockPeriod),
      ],
      sender.address
    );
  }

  mineTokens(
    amountUstx: number,
    sender: Account,
    memo: ArrayBuffer | undefined = undefined
  ): Tx {
    let memoVal: string;

    if (typeof memo == "undefined") {
      memoVal = types.none();
    } else {
      memoVal = types.some(types.buff(memo));
    }

    return Tx.contractCall(
      this.contractName,
      "mine-tokens",
      [types.uint(amountUstx), memoVal],
      sender.address
    );
  }

  claimMiningReward(minedStacksBlockHeight: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "claim-mining-reward",
      [types.uint(minedStacksBlockHeight)],
      sender.address
    );
  }

  claimStackingReward(targetRewardCycle: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "claim-stacking-reward",
      [types.uint(targetRewardCycle)],
      sender.address
    );
  }

  getStackedPerCycle(stacker: Account, cycle: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-stacked-per-cycle", [
      types.principal(stacker.address),
      types.uint(cycle),
    ]);
  }

  registerMiner(
    sender: Account,
    memo: ArrayBuffer | undefined = undefined
  ): Tx {
    let memoVal: string;

    if (typeof memo == "undefined") {
      memoVal = types.none();
    } else {
      memoVal = types.some(types.buff(memo));
    }

    return Tx.contractCall(
      this.contractName,
      "register-miner",
      [memoVal],
      sender.address
    );
  }

  setCityWalletUnsafe(cityWallet: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-city-wallet-unsafe",
      [types.principal(cityWallet.address)],
      this.deployer.address
    );
  }

  setCityWallet(cityWallet: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-city-wallet",
      [types.principal(cityWallet.address)],
      sender.address
    );
  }

  getCityWallet(): ReadOnlyFn {
    return this.callReadOnlyFn("get-city-wallet");
  }

  getTotalSupplyUstx(): ReadOnlyFn {
    return this.callReadOnlyFn("get-total-supply-ustx");
  }

  getMiningActivationStatus(): ReadOnlyFn {
    return this.callReadOnlyFn("get-mining-activation-status");
  }

  getRegisteredMinersThreshold(): ReadOnlyFn {
    return this.callReadOnlyFn("get-registered-miners-threshold");
  }

  getRegisteredMinersNonce(): ReadOnlyFn {
    return this.callReadOnlyFn("get-registered-miners-nonce");
  }

  findLeastCommitment(stacksBlockHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("find-least-commitment", [
      types.uint(stacksBlockHeight),
    ]);
  }
}

export class MinedBlock {
  minersCount: number;
  leastCommitmentIdx: number;
  leastCommitmentUstx: number;
  claimed: boolean;

  constructor(
    minersCount: number,
    leastCommitmentIdx: number,
    leastCommitmentUstx: number,
    claimed: boolean
  ) {
    this.minersCount = minersCount;
    this.leastCommitmentIdx = leastCommitmentIdx;
    this.leastCommitmentUstx = leastCommitmentUstx;
    this.claimed = claimed;
  }

  convert(): string {
    return types.tuple({
      "miners-count": types.uint(this.minersCount),
      "least-commitment-idx": types.uint(this.leastCommitmentIdx),
      "least-commitment-ustx": types.uint(this.leastCommitmentUstx),
      claimed: types.bool(this.claimed),
    });
  }
}

export interface MinerCommit {
  miner: Account;
  minerId: number;
  amountUstx: number;
}

export class MinersList extends Array<MinerCommit> {
  convert(): string {
    if (this.length > 128) {
      throw new Error("Miners list can't have more than 128 elements.");
    }

    let miners = this.map((minerCommit) => {
      return types.tuple({
        "miner-id": types.uint(minerCommit.minerId),
        "amount-ustx": types.uint(minerCommit.amountUstx),
      });
    });

    return types.list(miners);
  }

  getFormatted(index: number) {
    let item = this[index];
    return {
      "miner-id": types.uint(item.minerId),
      ustx: types.uint(item.amountUstx),
    };
  }
}

export class MinersRec {
  miners: MinersList;
  claimed: boolean;
  leastCommitment?: MinerCommit;

  constructor(
    miners: MinersList,
    claimed: boolean,
    leastCommitment?: MinerCommit
  ) {
    this.claimed = claimed;
    this.miners = miners;

    if (typeof leastCommitment !== "undefined") {
      this.leastCommitment = leastCommitment;
    }
  }

  convert(): string {
    let leastCommitment;
    if (this.leastCommitment !== undefined) {
      leastCommitment = types.some(
        types.tuple({
          "miner-id": types.uint(this.leastCommitment.minerId),
          "amount-ustx": types.uint(this.leastCommitment.amountUstx),
        })
      );
    } else {
      leastCommitment = types.none();
    }

    return types.tuple({
      miners: this.miners.convert(),
      claimed: types.bool(this.claimed),
      "least-commitment": leastCommitment,
    });
  }
}
