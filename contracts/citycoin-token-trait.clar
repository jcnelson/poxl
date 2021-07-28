;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; CITYCOIN TOKEN TRAIT
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-trait citycoin-token
  (

    (activate-token (principal uint)
      (response bool uint)
    )

    (set-token-uri ((optional (string-utf8 256)))
      (response bool uint)
    )

    (mint (uint principal)
      (response bool uint)
    )

    (burn (uint principal)
      (response bool uint)
    )

    (send-many ((list 200 uint))
      (response bool uint)
    )

  )
)
