import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_UNAUTHORIZED = 1000,
  ERR_CONTRACT_ALREADY_EXISTS = 1001,
  ERR_CONTRACT_DO_NOT_EXISTS = 1002,
  ERR_VOTE_HAS_ENDED = 1003,
  ERR_VOTE_STILL_IN_PROGRESS = 1004,
}

enum ContractState {
  STATE_DEFINED = 0,
  STATE_STARTED = 1,
  STATE_LOCKED_IN = 2,
  STATE_ACTIVE = 3,
  STATE_FAILED = 4,
}

export class CoreClient extends Client {
  static readonly ErrCode = ErrCode;
  static readonly ContractState = ContractState;
  static readonly DEFAULT_VOTING_PERIOD = 200;

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

  addMiningContract(contractAddress: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "add-mining-contract",
      [types.principal(contractAddress)],
      sender.address
    );
  }

  getMiningContract(contractAddress: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-mining-contract", [
      types.principal(contractAddress),
    ]);
  }

  getMiningContractVote(contractId: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-mining-contract-vote", [
      types.uint(contractId),
    ]);
  }

  voteOnMiningContract(contractAddress: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "vote-on-mining-contract",
      [types.principal(contractAddress)],
      sender.address
    );
  }

  closeMiningContractVote(contractId: number, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "close-mining-contract-vote",
      [types.uint(contractId)],
      sender.address
    );
  }

  getActiveMiningContract(): ReadOnlyFn {
    return this.callReadOnlyFn("get-active-mining-contract");
  }

  createVoteTuple(
    contractAddress: string,
    startBH: number,
    endBH: number,
    miners: number,
    votes: number
  ): object {
    return {
      address: contractAddress,
      startBH: types.uint(startBH),
      endBH: types.uint(endBH),
      miners: types.uint(miners),
      votes: types.uint(votes),
    };
  }
}
