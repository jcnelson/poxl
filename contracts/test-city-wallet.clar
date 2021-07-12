;; This contract is used only during tests to verify if contract set as a city wallet will be able to change it to different address
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED u401)

(define-public (set-city-wallet (new-wallet principal))
  (begin
    (asserts! (is-eq contract-caller CONTRACT_OWNER) (err ERR_UNAUTHORIZED))
    (contract-call? 'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.citycoin-logic-v1 set-city-wallet new-wallet)
  )
)