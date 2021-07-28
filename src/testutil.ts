import { Account, Chain, Tx, it } from "../deps.ts";
import { TokenClient } from "./token-client.ts";
import { CoreClient } from "./core-client.ts";
import { AuthClient } from "./auth-client.ts";

class Accounts extends Map<string, Account> {}

interface Clients {
  token: TokenClient;
  core: CoreClient;
  core2: CoreClient;
  auth: AuthClient;
}

function _it(
  name: string,
  fn: (chain: Chain, accounts: Accounts, clients: Clients) => void
) {
  it(name, async () => {
    let chain: Chain;
    let accounts: Accounts;
    let deployer: Account;
    let clients: Clients;

    (Deno as any).core.ops();
    let transactions: Array<Tx> = [];
    let result = JSON.parse(
      (Deno as any).core.opSync("setup_chain", {
        name: "citycoin",
        transactions: transactions,
      })
    );

    chain = new Chain(result["session_id"]);
    accounts = new Map();

    for (let account of result["accounts"]) {
      accounts.set(account.name, account);
    }

    deployer = accounts.get("deployer")!;
    clients = {
      token: new TokenClient("citycoin-token", chain, deployer),
      auth: new AuthClient("citycoin-auth", chain, deployer),
      core: new CoreClient("citycoin-core-v1", chain, deployer),
      core2: new CoreClient("citycoin-core-v2", chain, deployer),
    };

    await fn(chain, accounts, clients);
  });
}

export { _it as it };
