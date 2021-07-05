
;; test to attempt changing city wallet from an unapproved address
(define-public (attack)
  (contract-call? .citycoin set-city-wallet 'STFCVYY1RJDNJHST7RRTPACYHVJQDJ7R1DWTQHQA)
)
