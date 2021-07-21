import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_UNAUTHORIZED = 1000,
  ERR_CONTRACT_ALREADY_EXISTS,
  ERR_CONTRACT_DOES_NOT_EXIST,
  ERR_VOTE_HAS_ENDED,
  ERR_VOTE_STILL_IN_PROGRESS,
  ERR_ALREADY_VOTED,
  ERR_PROPOSAL_DOES_NOT_EXIST,
  ERR_PROPOSAL_ALREADY_CLOSED,
  ERR_NOTHING_TO_VOTE_ON,
  ERR_CANT_VOTE_ON_OLD_PROPOSAL,
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
}
