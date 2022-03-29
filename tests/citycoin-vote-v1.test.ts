import { describe, assertEquals, types, Account, run, Chain, it, beforeEach} from "../deps.ts";
import { CoreModel } from "../models/core.model.ts";
import { SendManyRecord, TokenModel } from "../models/token.model.ts";
import { Accounts, Context } from "../src/context.ts";

let ctx: Context;
let chain: Chain;
let accounts: Accounts;
let token: TokenModel;
let core: CoreModel;

beforeEach(() => {
  ctx = new Context();
  chain = ctx.chain;
  accounts = ctx.accounts;
  token = ctx.models.get(TokenModel);
  core = ctx.models.get(CoreModel);
})

describe("[CityCoin Vote v1]"), () => {
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
  // get-proposal-votes
    // succeeds with base proposal record with no voters
    // succeeds with voter data after successful vote
  // get-voter
    // succeeds with none if voter not found
    // succeeds with some if voter found
  // get-voter-id
    // succeeds with none if voter not found
    // succeeds with some if voter found
  // get-voter-info
    // succeeds with ok none if voter not found
    // succeeds with ok some if voter found
}