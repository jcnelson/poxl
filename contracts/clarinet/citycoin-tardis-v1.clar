;; CityCoins Tardis
;; A way to view historical information about MIA/NYC
;; to work around the API not accepting tip parameters

;; ERRORS

(define-constant ERR_INVALID_BLOCK u7000)

;; get block hash by height

(define-private (get-block-hash (blockHeight uint))
  (get-block-info? id-header-hash blockHeight)
)

;; get-balance MIA

(define-read-only (get-historical-mia-balance (blockHeight uint) (address principal))
  (let 
    (
      (blockHash (unwrap! (get-block-hash blockHeight) (err ERR_INVALID_BLOCK)))
      (balance (at-block blockHash (contract-call? .citycoin-token get-balance address)))
    )
    (ok balance)
  )
)
