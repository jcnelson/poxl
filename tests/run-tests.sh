#!/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
contracts_dir_rel="${script_dir}/../contracts"
contracts_dir=$(readlink -e "$contracts_dir_rel")
contract_name="citycoin"

contract="${contracts_dir}/${contract_name}.clar"
initial_allocations="${script_dir}/initial-balances.json"
contract_addr="SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D"
contract_id="${contract_addr}.${contract_name}"
tx_sender="S1G2081040G2081040G2081040G208105NK8PE5"

sip10_contract="${contracts_dir}/sip-10-ft-standard.clar"
sip10_contract_addr="SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE"
sip10_contract_id="${sip10_contract_addr}.sip-10-ft-standard"

specific_test="$1"

set -ueo pipefail

if ! command -v clarity-cli &> /dev/null; then
    echo "ERROR: clarity-cli could not be found"
    exit 1
fi

test_header() {
   local test_name=$1

   echo -e "
==========================
   Run test ${test_name}
=========================="
}

run_test() {
   local test_name="$1"
   local test_dir="$2"

   test_header "${test_name}"

   local result="$(clarity-cli execute "$test_dir" "$contract_id" "$test_name" "$tx_sender" 2>&1)"
   local rc=$?
   printf "$result\n"
   if [ $rc -ne 0 ] || [ -n "$(echo "$result" | egrep '^Aborted: ')" ]; then
      echo "Test $test_name failed"
      exit 1
   fi
}

for contract_test in $(ls ${script_dir}/test-*.clar); do
   if [ -n "$specific_test" ] && [ "$contract_test" != "$specific_test" ]; then
      continue;
   fi

   test_dir="/tmp/vm-${contract_name}-$(basename "$contract_test").db"
   test -d "$test_dir" && rm -rf "$test_dir"

   mkdir -p "$test_dir"

   clarity-cli initialize "$initial_allocations" "$test_dir"

   echo "Tests begin at line $(wc -l "$contract" | cut -d ' ' -f 1)"
   cat "$contract" "$contract_test" > "$test_dir/contract-with-tests.clar"

   echo "Instatiate SIP-10 contract"
   clarity-cli launch "${sip10_contract_id}" "${sip10_contract}" "${test_dir}"

   echo "Instantiate $contract_id"
   clarity-cli launch "$contract_id" "$test_dir/contract-with-tests.clar" "$test_dir"

   echo "Run tests"
   tests="$(clarity-cli execute "$test_dir" "$contract_id" "list-tests" "$tx_sender" 2>&1 | \
      grep 'Transaction executed and committed. Returned: ' | \
      sed -r -e 's/Transaction executed and committed. Returned: \((.+)\)/\1/g' -e 's/"//g')"

   echo "Tests: ${tests}"

   for test_name in $tests; do
      run_test "${test_name}" "${test_dir}"
   done
done
