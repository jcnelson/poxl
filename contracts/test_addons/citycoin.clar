;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; functions used only during testing
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(define-public (generate-miner-id (miner principal))
  (ok (get-or-create-miner-id miner))
)

(define-public (fake-mine-tokens (who principal) (stacks-block-height uint) (amount-ustx uint))
    (let
        (
            (miner-id (get-or-create-miner-id who))
        )
        (try! (set-tokens-mined who miner-id stacks-block-height amount-ustx u0 u0))
        (ok true)
    )
)

(define-public (set-city-wallet-unsafe (wallet-address principal))
  ;; specify city wallet address for testing, allows for a test wallet
  ;; to be used in place of specific city wallet defined in constant
  (begin
    (var-set city-wallet wallet-address)
    (ok true)
  )
)

;; used in tests to bring down activation threshold to lower level
(define-public (set-mining-activation-threshold (new-threshold uint))
  (ok (var-set mining-activation-threshold new-threshold))
)


(define-public (activate-mining)
  (begin
    (var-set city-wallet 'STFCVYY1RJDNJHST7RRTPACYHVJQDJ7R1DWTQHQA)
    (var-set mining-activation-threshold u1)
    (register-miner none)
  )
)