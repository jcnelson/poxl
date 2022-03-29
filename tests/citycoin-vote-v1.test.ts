import { describe, assertEquals, types, Account, run, Chain, it, beforeEach} from "../deps.ts";
import { CoreModel } from "../models/core.model.ts";
import { VoteModel } from "../models/vote.model.ts";
import { Accounts, Context } from "../src/context.ts";

let ctx: Context;
let chain: Chain;
let accounts: Accounts;
let vote: VoteModel;
let core: CoreModel;

beforeEach(() => {
  ctx = new Context();
  chain = ctx.chain;
  accounts = ctx.accounts;
  vote = ctx.models.get(VoteModel);
  core = ctx.models.get(CoreModel);
})

describe("[CityCoin Vote v1]", () => {
  // vote-on-proposal
    // fails when called before proposal is active
    // fails when called after proposal is active
    // fails if user doesn't have any stacked tokens
    // succeeds when called by a new voter
      // check proposal record values
      // check voter record values
      // check with MIA, with NYC, with both
    // fails when called by an existing voter with same vote
    // succeeds when called by an existing voter with different vote
      // check proposal record values
      // check voter record values
      // check with MIA, with NYC, with both
  //describe("vote-on-proposal()", () => {
  //  
  //}
  
  describe("get-proposal-votes()", () => {
    it("succeeds with base proposal record with no voters", () => {
      // arrange
      const result = vote.getProposalVotes().result;
      // TODO: refine like SendManyRecord in token model
      const expected = {
        noCount: 0,
        noMia: 0,
        noNyc: 0,
        noTotal: 0,
        yesCount: 0,
        yesMia: 0,
        yesNyc: 0,
        yesTotal: 0
      }
      // assert
      assertEquals(result.expectSome().expectTuple(), {
        noCount: types.uint(expected.noCount),
        noMia: types.uint(expected.noMia),
        noNyc: types.uint(expected.noNyc),
        noTotal: types.uint(expected.noTotal),
        yesCount: types.uint(expected.yesCount),
        yesMia: types.uint(expected.yesMia),
        yesNyc: types.uint(expected.yesNyc),
        yesTotal: types.uint(expected.yesTotal)
      })
    });
    //it("succeeds with voter data after successful vote", () => {
      // arrange
      // act
      // assert
    //}
  });

  // get-voter
    // succeeds with none if voter not found
    // succeeds with some if voter found
  //describe("get-voter()", () => {
  //
  //}

  // get-voter-id
    // succeeds with none if voter not found
    // succeeds with some if voter found
  //describe("get-voter-id()", () => {
  //
  //}

  // get-voter-info
    // succeeds with ok none if voter not found
    // succeeds with ok some if voter found
  //describe("get-voter-info()", () => {
  //
  //}
});

run();