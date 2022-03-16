;; CityCoins Tardis
;; A way to view historical information about MIA/NYC
;; to work around the API not accepting tip parameters

;; ERRORS

(define-constant ERR_INVALID_BLOCK u7000)

;; get block hash by height

(define-private (get-block-hash (blockHeight uint))
  (unwrap! (get-block-info? id-header-hash blockHeight) (err ERR_INVALID_BLOCK))
)

;; get-balance MIA

(define-read-only (get-historical-mia-balance (blockHeight uint) (address principal))
  (let 
    (
      (blockHash (get-block-hash blockHeight))
      (balance (at-block blockHash (try! (contract-call? .citycoin-core-v1 get-balance address))))
    )
    (ok balance)
  )
)
