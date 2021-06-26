import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_UNAUTHORIZED = 1000,
  ERR_CANDIDATE_ALREADY_EXISTS = 1001,
}

export class CoreClient extends Client {
  static readonly ErrCode = ErrCode;

  unsafeSetCityWallet(newCityWallet: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "unsafe-set-city-wallet",
      [types.principal(newCityWallet.address)],
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

  addMiningCandidate(contractAddress: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "add-mining-candidate",
      [types.principal(contractAddress)],
      sender.address
    );
  }

  getMiningCandidate(contractAddress: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-mining-candidate", [
      types.principal(contractAddress),
    ]);
  }
}
