
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; FUNCTIONS ONLY USED DURING TESTS
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-public (test-unsafe-set-city-wallet (newCityWallet principal))
  (ok (var-set cityWallet newCityWallet))
)

(define-public (test-set-activation-threshold (newThreshold uint))
  (ok (var-set activationThreshold newThreshold))
)

(define-public (test-generate-user-id (user principal))
  (ok (get-or-create-user-id user))
)

(define-public (test-activate-contract)
  (begin
    ;; (var-set cityWallet 'STFCVYY1RJDNJHST7RRTPACYHVJQDJ7R1DWTQHQA)
    (var-set activationThreshold u2)
    (ok true)
  )
)

(define-public (test-shutdown-contract (stacksHeight uint))
  (begin
    ;; set variables to disable mining/stacking in CORE
    (var-set activationReached false)
    (var-set shutdownHeight stacksHeight)
    ;; set variable to allow for all stacking claims
    (var-set isShutdown true)
    (ok true)
  )
)
