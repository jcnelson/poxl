(define-constant CONTRACT_OWNER tx-sender)

(define-constant ERR_UNAUTHORIZED u1000)


(define-data-var cityWallet principal 'ST31270FK25JBGCRWYT7RNK90E946R8VW6SZYSQR6)

(define-read-only (get-city-wallet)
  (var-get cityWallet)
)

(define-public (set-city-wallet (newCityWallet principal))
  (begin
    (asserts! (is-authorized) (err ERR_UNAUTHORIZED))
    (ok (var-set cityWallet newCityWallet))
  )
)







;; --------------------
(define-private (is-authorized)
  (is-eq contract-caller (var-get cityWallet))
)