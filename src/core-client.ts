import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_FT_INSUFFICIENT_BALANCE = 1,
  ERR_UNAUTHORIZED = 1000,
  ERR_USER_ALREADY_REGISTERED,
  ERR_USER_NOT_FOUND,
  ERR_USER_ID_NOT_FOUND,
  ERR_ACTIVATION_THRESHOLD_REACHED,
  ERR_CONTRACT_NOT_ACTIVATED,
  ERR_USER_ALREADY_MINED,
  ERR_INSUFFICIENT_COMMITMENT,
  ERR_INSUFFICIENT_BALANCE,
  ERR_USER_DID_NOT_MINE_IN_BLOCK,
  ERR_CLAIMED_BEFORE_MATURITY,
  ERR_NO_MINERS_AT_BLOCK,
  ERR_REWARD_ALREADY_CLAIMED,
  ERR_MINER_DID_NOT_WIN,
  ERR_NO_VRF_SEED_FOUND,
  ERR_STACKING_NOT_AVAILABLE,
  ERR_CANNOT_STACK,
  ERR_REWARD_CYCLE_NOT_COMPLETED,
  ERR_NOTHING_TO_REDEEM,
}

export class CoreClient extends Client {
  static readonly ErrCode = ErrCode;
  static readonly ACTIVATION_DELAY = 150;
  static readonly ACTIVATION_THRESHOLD = 20;
  static readonly TOKEN_HALVING_BLOCKS = 210000;
  static readonly REWARD_CYCLE_LENGTH = 2100;
  static readonly SPLIT_CITY_PCT = 0.3;
  static readonly TOKEN_REWARD_MATURITY = 100;
  static readonly BONUS_PERIOD_LENGTH = 10000;

  //////////////////////////////////////////////////
  // CITY WALLET MANAGEMENT
  //////////////////////////////////////////////////

  setCityWallet(newCityWallet: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-city-wallet",
      [types.principal(newCityWallet.address)],
      sender.address
    );
  }

  getCityWallet(): ReadOnlyFn {
    return this.callReadOnlyFn("get-city-wallet");
  }

  //////////////////////////////////////////////////
  // REGISTRATION
  //////////////////////////////////////////////////

  getActivationBlock(): ReadOnlyFn {
    return this.callReadOnlyFn("get-activation-block");
  }

  getActivationDelay(): ReadOnlyFn {
    return this.callReadOnlyFn("get-activation-delay");
  }

  getActivationStatus(): ReadOnlyFn {
    return this.callReadOnlyFn("get-activation-status");
  }

  getActivationThreshold(): ReadOnlyFn {
    return this.callReadOnlyFn("get-activation-threshold");
  }

  registerUser(sender: Account, memo: string | undefined = undefined): Tx {
    return Tx.contractCall(
      this.contractName,
      "register-user",
      [
        typeof memo == "undefined"
          ? types.none()
          : types.some(types.utf8(memo)),
      ],
      sender.address
    );
  }

  getRegisteredUsersNonce(): ReadOnlyFn {
    return this.callReadOnlyFn("get-registered-users-nonce");
  }

  getUserId(user: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-user-id", [types.principal(user.address)]);
  }

  getUser(userId: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-user", [types.uint(userId)]);
  }

  //////////////////////////////////////////////////
  // MINING CONFIGURATION
  //////////////////////////////////////////////////

  getBlockWinnerId(stacksHeight: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-block-winner-id", [
      types.uint(stacksHeight),
    ]);
  }

  //////////////////////////////////////////////////
  // MINING ACTIONS
  //////////////////////////////////////////////////

  mineTokens(
    amountUstx: number,
    miner: Account,
    memo: ArrayBuffer | undefined = undefined
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "mine-tokens",
      [
        types.uint(amountUstx),
        typeof memo == "undefined"
          ? types.none()
          : types.some(types.buff(memo)),
      ],
      miner.address
    );
  }

  //////////////////////////////////////////////////
  // MINING REWARD CLAIM ACTIONS
  //////////////////////////////////////////////////

  claimMiningReward(minerBlockHeight: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "claim-mining-reward",
      [types.uint(minerBlockHeight)],
      sender.address
    );
  }

  //////////////////////////////////////////////////
  // STACKING CONFIGURATION
  //////////////////////////////////////////////////

  getStackerAtCycleOrDefault(rewardCycle: number, userId: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-stacker-at-cycle-or-default", [
      types.uint(rewardCycle),
      types.uint(userId),
    ]);
  }

  //////////////////////////////////////////////////
  // STACKING ACTIONS
  //////////////////////////////////////////////////

  stackTokens(amountTokens: number, lockPeriod: number, stacker: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "stack-tokens",
      [types.uint(amountTokens), types.uint(lockPeriod)],
      stacker.address
    );
  }

  //////////////////////////////////////////////////
  // STACKING REWARD CLAIMS
  //////////////////////////////////////////////////

  claimStackingReward(targetCycle: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "claim-stacking-reward",
      [types.uint(targetCycle)],
      sender.address
    );
  }

  //////////////////////////////////////////////////
  // TOKEN CONFIGURATION
  //////////////////////////////////////////////////

  //////////////////////////////////////////////////
  // UTILITIES
  //////////////////////////////////////////////////

  //////////////////////////////////////////////////
  // TESTING ONLY
  //////////////////////////////////////////////////

  unsafeSetCityWallet(newCityWallet: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "test-unsafe-set-city-wallet",
      [types.principal(newCityWallet.address)],
      this.deployer.address
    );
  }

  unsafeSetActivationThreshold(newThreshold: number): Tx {
    return Tx.contractCall(
      this.contractName,
      "test-set-activation-threshold",
      [types.uint(newThreshold)],
      this.deployer.address
    );
  }

  testInitializeCore(coreContract: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "test-initialize-core",
      [types.principal(coreContract)],
      this.deployer.address
    );
  }

  testMint(amount: number, recipient: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "test-mint",
      [types.uint(amount), types.principal(recipient.address)],
      sender.address
    );
  }
}
