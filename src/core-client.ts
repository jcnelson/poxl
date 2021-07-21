import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
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
  static readonly TOKEN_HALVING_BLOCKS = 210000;
  static readonly REWARD_CYCLE_LENGTH = 2100;
  static readonly SPLIT_CITY_PCT = 0.3;

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

  getActivationBlock(): ReadOnlyFn {
    return this.callReadOnlyFn("get-activation-block");
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

  getUserId(user: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-user-id", [types.principal(user.address)]);
  }

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

  stackTokens(amountTokens: number, lockPeriod: number, stacker: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "stack-tokens",
      [types.uint(amountTokens), types.uint(lockPeriod)],
      stacker.address
    );
  }
}
