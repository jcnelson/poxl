import { Account, Chain, Tx } from "../deps.ts";
import { CityCoinClient } from "./citycoin-client.ts";
import { TokenClient } from "./token-client.ts";
import { it } from "../deps.ts";
import { CoreClient } from "./core-client.ts";

class Accounts extends Map<string, Account> {}

interface Clients {
  citycoin: CityCoinClient;
  token: TokenClient;
  core: CoreClient;
}

function _it(
  name: string,
  fn:
    | ((chain: Chain, accounts: Accounts, clients: Clients) => void)
    | ((chain: Chain, accounts: Accounts, clients: Clients) => Promise<void>)
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
      citycoin: new CityCoinClient("citycoin", chain, deployer),
      token: new TokenClient("token", chain, deployer),
      core: new CoreClient("core", chain, deployer),
    };

    await fn(chain, accounts, clients);
  });
}

export { _it as it };
