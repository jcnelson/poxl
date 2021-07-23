import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_UNAUTHORIZED = 2000,
}

export class TokenClient extends Client {
  static readonly ErrCode = ErrCode;

  /**
   * Mints token to make testing easier.
   *
   * @param amount
   * @param recipient
   */
  ftMint(amount: number, recipient: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "test-mint",
      [types.uint(amount), types.principal(recipient.address)],
      this.deployer.address
    );
  }

  setTrustedCaller(newTrustedCaller: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "test-set-trusted-caller",
      [types.principal(newTrustedCaller.address)],
      this.deployer.address
    );
  }

  // SIP-010 functions
  transfer(
    amount: number,
    from: Account,
    to: Account,
    sender: Account,
    memo: ArrayBuffer | undefined = undefined
  ): Tx {
    let memoVal: string;

    if (typeof memo == "undefined") {
      memoVal = types.none();
    } else {
      memoVal = types.some(types.buff(memo));
    }

    return Tx.contractCall(
      this.contractName,
      "transfer",
      [
        types.uint(amount),
        types.principal(from.address),
        types.principal(to.address),
        memoVal,
      ],
      sender.address
    );
  }

  getName(): ReadOnlyFn {
    return this.callReadOnlyFn("get-name");
  }

  getSymbol(): ReadOnlyFn {
    return this.callReadOnlyFn("get-symbol");
  }

  getDecimals(): ReadOnlyFn {
    return this.callReadOnlyFn("get-decimals");
  }

  getBalance(user: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-balance", [types.principal(user.address)]);
  }

  getTotalSupply(): ReadOnlyFn {
    return this.callReadOnlyFn("get-total-supply");
  }

  getTokenUri(): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-uri");
  }

  setTokenUri(sender: Account, newUri?: string | undefined): Tx {
    let newUriVal: string;

    if (typeof newUri == "undefined") {
      newUriVal = types.none();
    } else {
      newUriVal = types.some(types.utf8(newUri));
    }

    return Tx.contractCall(
      this.contractName,
      "set-token-uri",
      [newUriVal],
      sender.address
    );
  }

  mint(amount: number, recipient: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint",
      [types.uint(amount), types.principal(recipient.address)],
      sender.address
    );
  }

  // send many
  sendMany(recipients: Array<SendManyRecord>, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "send-many",
      [
        types.list(
          recipients.map((record) => {
            return types.tuple({
              to: types.principal(record.to.address),
              amount: types.uint(record.amount),
              memo:
                typeof record.memo == "undefined"
                  ? types.none()
                  : types.some(types.buff(record.memo)),
            });
          })
        ),
      ],
      sender.address
    );
  }
}

export class SendManyRecord {
  constructor(
    readonly to: Account,
    readonly amount: number,
    readonly memo: ArrayBuffer
  ) {}
}
