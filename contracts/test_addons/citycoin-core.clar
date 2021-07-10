
;; unsafe functions used only during tests
(define-public (unsafe-set-city-wallet (newCityWallet principal))
  (ok (var-set cityWallet newCityWallet))
)