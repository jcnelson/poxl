import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Model } from "../src/model.ts";

enum ErrCode {
  ERR_USER_NOT_FOUND = 8000,
  ERR_STACKER_NOT_FOUND,
  ERR_PROPOSAL_NOT_FOUND,
  ERR_PROPOSAL_NOT_ACTIVE,
  ERR_VOTE_ALREADY_CAST,
  ERR_NOTHING_STACKED,
}

export class VoteModel extends Model {
  name = "citycoin-vote-v1";
  static readonly ErrCode = ErrCode;

  voteOnProposal(vote: boolean, sender: Account): Tx {
    return this.callPublic(
      "vote-on-proposal",
      [types.bool(vote)],
      sender.address
    );
  }

  getProposalVotes(): ReadOnlyFn {
    return this.callReadOnly("get-proposal-votes");
  }

  getVoter(voterId: number): ReadOnlyFn {
    return this.callReadOnly("get-voter", [types.uint(voterId)]);
  }

  getVoterId(voter: Account): ReadOnlyFn { 
    return this.callReadOnly("get-voter-id", [types.principal(voter.address)]);
  }

  getVoterInfo(voter: Account): ReadOnlyFn {
    return this.callReadOnly("get-voter-info", [types.principal(voter.address)]);
  }
}