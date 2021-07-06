import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_UNAUTHORIZED = 1000,
  ERR_CONTRACT_ALREADY_EXISTS = 1001,
  ERR_CONTRACT_DOES_NOT_EXIST = 1002,
  ERR_VOTE_HAS_ENDED = 1003,
  ERR_VOTE_STILL_IN_PROGRESS = 1004,
  ERR_ALREADY_VOTED = 1005,
  ERR_PROPOSAL_DOES_NOT_EXIST = 1006,
  ERR_PROPOSAL_ALREADY_CLOSED = 1007,
}

enum ContractState {
  STATE_DEFINED = 0,
  STATE_STARTED = 1,
  STATE_LOCKED_IN = 2,
  STATE_ACTIVE = 3,
  STATE_FAILED = 4,
}

interface ProposalTuple {
  contractAddress: string;
  startBH: number;
  endBH: number;
  miners: number;
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

  proposeContract(name: string, contractAddress: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "propose-contract",
      [types.ascii(name), types.principal(contractAddress)],
      sender.address
    );
  }

  getContract(contractAddress: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-contract", [
      types.principal(contractAddress),
    ]);
  }

  getProposal(id: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-proposal", [types.uint(id)]);
  }

  voteOnContract(contractAddress: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "vote-on-contract",
      [types.principal(contractAddress)],
      sender.address
    );
  }

  closeProposal(id: number, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "close-proposal",
      [types.uint(id)],
      sender.address
    );
  }

  getActiveContract(name: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-active-contract", [types.ascii(name)]);
  }

  createProposalTuple(data: ProposalTuple): object {
    return {
      address: data.contractAddress,
      startBH: types.uint(data.startBH),
      endBH: types.uint(data.endBH),
      miners: types.uint(data.miners),
      votes: types.uint(data.votes),
      isOpen: types.bool(data.isOpen),
    };
  }
}
