(define-constant CONTRACT_OWNER tx-sender)

(define-constant ERR_UNAUTHORIZED u1000)
(define-constant ERR_CANDIDATE_ALREADY_EXISTS u1001)


(define-data-var cityWallet principal 'ST31270FK25JBGCRWYT7RNK90E946R8VW6SZYSQR6)

(define-map MiningCandidates
  { contract: principal }
  {
    votes: uint
  }
)

(define-read-only (get-city-wallet)
  (var-get cityWallet)
)

(define-public (set-city-wallet (newCityWallet principal))
  (begin
    (asserts! (is-authorized) (err ERR_UNAUTHORIZED))
    (ok (var-set cityWallet newCityWallet))
  )
)

(define-read-only (get-mining-candidate (contract principal))
  (map-get? MiningCandidates { contract: contract })
)

(define-public (add-mining-candidate (contract principal))
  (begin
    (asserts! (is-authorized) (err ERR_UNAUTHORIZED))
    (asserts! (is-none (get-mining-candidate contract)) (err ERR_CANDIDATE_ALREADY_EXISTS))
    (ok (map-set MiningCandidates
      { contract: contract }
      { votes: u0 }
    ))
  )
)





;; --------------------
(define-private (is-authorized)
  (is-eq contract-caller (var-get cityWallet))
)