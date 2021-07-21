import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_UNAUTHORIZED = 1000,
  ERR_USER_ALREADY_REGISTERED = 1001,
  ERR_ACTIVATION_THRESHOLD_REACHED = 1003,
}

enum ContractState {
  STATE_DEFINED = 0,
  STATE_STARTED,
  STATE_LOCKED_IN,
  STATE_ACTIVE,
  STATE_FAILED,
}

interface ProposalTuple {
  contractAddress: string;
  startBH: number;
  endBH: number;
  voters: number;
  votes: number;
  isOpen: boolean;
}

export class CoreClient extends Client {
  static readonly ErrCode = ErrCode;
  static readonly ContractState = ContractState;
  static readonly DEFAULT_VOTING_PERIOD = 200;

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
}
