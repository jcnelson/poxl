# Set up clarity-cli

In order to run the tests included in this repo, you must first build and install `clarity-cli`.

## TL;DR

Download the [stacks-blockchain repository](https://github.com/blockstack/stacks-blockchain) and use cargo to build the executable:

```bash
cargo build --workspace --release --bin clarity-cli
```

By default, the file is located in `./stacks-blockchain/target/release`, which should be added to the PATH variable.

## Linux

The full configuration instructions including prerequisites are below, this should work with any Debian/Ubuntu based distribution.

### Prerequisites

Install Required Packages

```bash
sudo apt-get install -qq build-essential cmake libssl-dev pkg-config git
```

Install Node Version Manager (NVM)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
source "$HOME"/.nvm/nvm.sh
source "$HOME"/.bashrc
```

Install Node.js

```bash
nvm install --lts
```

Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME"/.cargo/env
```

### Clone repository

```bash
git clone git@github.com:blockstack/stacks-blockchain.git
```

***Note:** if you are not using ssh with GitHub, use the HTTPS URL instead.*

```bash
git clone https://github.com/blockstack/stacks-blockchain.git
```

### Build clarity-cli

```bash
cd ./stacks-blockchain
cargo build --workspace --release --bin clarity-cli
```

### Update PATH

This step is necessary to make `clarity-cli` available from any directory as well as in the test scripts.

You can use any text editor to edit the file, nano is a quick and easy option:

```bash
nano ~/.bashrc
```

Add the following text at the bottom:

```bash
export PATH="$HOME/path/to/stacks-blockchain/target/release:$PATH"
```

***Note:** replace `/path/to` with the path to the `stacks-blockchain` directory on your machine.*

Load the changes in your current shell:

```bash
source "$HOME"/.bashrc
```



### Testing it all worked

Each of the commands below should output a successful result:

```bash
$ command -v nvm
nvm

$ node -v
v14.16.0

$ rustc --version
rustc 1.51.0 (2fd73fabe 2021-03-23)

$ clarity-cli
Usage: clarity-cli [command]
where command is one of:
...(help contents)...
```
