;;;;;;;;;;;;;;;;;;;;; SIP 010 ;;;;;;;;;;;;;;;;;;;;;;
;; testnet: (impl-trait 'STR8P3RD1EHA8AA37ERSSSZSWKS9T2GYQFGXNA4C.sip-010-trait-ft-standard.sip-010-trait)
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR-UNAUTHORIZED u3)

;; set constant for contract owner, used for updating token-uri
(define-constant CONTRACT-OWNER tx-sender)

;; define initial token URI
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.citycoins.co/metadata/citycoin.json"))

;; set token URI to new value, only accessible by CONTRACT-OWNER
(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
    (begin
        (asserts! (is-eq tx-sender CONTRACT-OWNER) (err ERR-UNAUTHORIZED))
        (ok (var-set token-uri new-uri))
    )
)

;; The fungible token that can be Stacked.
(define-fungible-token citycoins)

;; SIP-010 functions
(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq from tx-sender)
            (err ERR-UNAUTHORIZED))

        (if (is-some memo)
            (print memo)
            none
        )

        (ft-transfer? citycoins amount from to)
    )
)

(define-read-only (get-name)
    (ok "citycoins"))

(define-read-only (get-symbol)
    (ok "CYCN"))

(define-read-only (get-decimals)
    (ok u0))

(define-read-only (get-balance (user principal))
    (ok (ft-get-balance citycoins user)))

(define-read-only (get-total-supply)
    (ok (ft-get-supply citycoins)))

(define-read-only (get-token-uri)
    (ok (var-get token-uri)))

;;---------------------------------------
;; Other functionality
(define-public (mint (amount uint) (recipient principal))
  (begin
    (ft-mint? citycoins amount recipient)
  )
)