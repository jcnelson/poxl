(begin
    ;; first-block-height, reward-cycle-length, token-reward-maturity, max-reward-cycles
    (unwrap-panic (configure u2 u5 u3 u32))
)

(define-public (list-tests)
    (begin
       (ok (list
           "unit-tests"
           "block-5"
           "block-6"
           "block-7"
           "block-8"
           "block-9"
           "block-10"
           "block-11"
           "block-12"
       ))
    )
)

(define-private (test-buff-to-u8)
   (begin
       (print "test-buff-to-u8")
       (asserts! (is-eq u0 (buff-to-u8 0x00)) (err u0))
       (asserts! (is-eq u127 (buff-to-u8 0x7f)) (err u0))
       (asserts! (is-eq u255 (buff-to-u8 0xff)) (err u0))
       (ok u0)
   )
)

(define-private (test-buff-to-uint-le)
    (begin
        (print "test-buff-to-uint-le")
        (asserts! (is-eq u0 (buff-to-uint-le 0x00000000000000000000000000000000)) (err u0))
        (asserts! (is-eq u1 (buff-to-uint-le 0x00000000000000000000000000000001)) (err u0))
        (asserts! (is-eq u256 (buff-to-uint-le 0x00000000000000000000000000000100)) (err u0))
        (asserts! (is-eq u170141183460469231731687303715884105727 (buff-to-uint-le 0x7fffffffffffffffffffffffffffffff)) (err u0))
        (asserts! (is-eq u340282366920938463463374607431768211455 (buff-to-uint-le 0xffffffffffffffffffffffffffffffff)) (err u0))
        (ok u0)
    )
)

(define-private (test-lower-16-le)
    (begin
        (print "test-lower-16-le")
        (asserts! (is-eq 0x8899aabbccddeeff0011223344556677 (lower-16-le 0x000000001111111122222222333333338899aabbccddeeff0011223344556677)) (err u0))
        (ok u0)
    )
)

(define-private (test-get-block-commit-total)
    (begin
        (print "test-get-block-commit-total")
        (asserts! (is-eq u0 (get-block-commit-total (list ))) (err u0))
        (asserts! (is-eq u6 (get-block-commit-total 
            (unwrap-panic (as-max-len? (list
                { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 }
                { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 }
                { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 }
            ) u32))))
            (err u0))
        (ok u0)
    )
)

(define-private (test-get-block-winner)
    (let (
        (miners-list
            (unwrap-panic (as-max-len? (list
                { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 }
                { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 }
                { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 }
            ) u32)))
    )
    (begin
        (print "test-get-block-winner")

        (asserts! (is-eq (some { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 })
            (get-block-winner u0 miners-list)) (err u0))
        
        (asserts! (is-eq (some { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 })
            (get-block-winner u1 miners-list)) (err u1))
        
        (asserts! (is-eq (some { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 })
            (get-block-winner u2 miners-list)) (err u2))
        
        (asserts! (is-eq (some { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 })
            (get-block-winner u3 miners-list)) (err u3))

        (asserts! (is-eq (some { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 })
            (get-block-winner u4 miners-list)) (err u4))

        (asserts! (is-eq (some { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 })
            (get-block-winner u5 miners-list)) (err u5))

        ;; wrap-around
        (asserts! (is-eq (some { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 })
            (get-block-winner u6 miners-list)) (err u6))

        (asserts! (is-eq none
            (get-block-winner u0 (list ))) (err u7))

        (ok u0)
    ))
)

(define-private (test-has-mined-in-list)
    (let (
        (miners-list
            (unwrap-panic (as-max-len? (list
                { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 }
                { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 }
                { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 }
            ) u32))))
    (begin
        (print "test-has-mined-in-list")

        (asserts! (has-mined-in-list 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P miners-list) (err u0))
        (asserts! (not (has-mined-in-list 'SP1G6P9VD2E455SB0KKSJN0711S1MGH5GXPN4RJ1E miners-list)) (err u0))

        (ok u0)
    ))
)

(define-private (test-can-claim-tokens)
    (let (
        (miners-list
            (unwrap-panic (as-max-len? (list
                { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 }
                { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 }
                { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 }
            ) u32)))
        (claimed-rec {
            miners: miners-list,
            claimed: true
        })
        (unclaimed-rec {
            miners: miners-list,
            claimed: false
        })
        (reward-maturity (var-get token-reward-maturity))
    )
    (begin
        (print "test-can-claim-tokens")

        (asserts! (is-eq (ok true) (can-claim-tokens 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P u0 u0 unclaimed-rec (+ u1 reward-maturity))) (err u0))
        (asserts! (is-eq (ok true) (can-claim-tokens 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69 u0 u1 unclaimed-rec (+ u1 reward-maturity))) (err u1))
        (asserts! (is-eq (ok true) (can-claim-tokens 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69 u0 u2 unclaimed-rec (+ u1 reward-maturity))) (err u2))
        (asserts! (is-eq (ok true) (can-claim-tokens 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN u0 u3 unclaimed-rec (+ u1 reward-maturity))) (err u3))
        (asserts! (is-eq (ok true) (can-claim-tokens 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN u0 u4 unclaimed-rec (+ u1 reward-maturity))) (err u4))
        (asserts! (is-eq (ok true) (can-claim-tokens 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN u0 u5 unclaimed-rec (+ u1 reward-maturity))) (err u5))
        
        (asserts! (is-eq (err ERR-UNAUTHORIZED) (can-claim-tokens 'SP1G6P9VD2E455SB0KKSJN0711S1MGH5GXPN4RJ1E u0 u0 unclaimed-rec (+ u1 reward-maturity))) (err u6))
        (asserts! (is-eq (err ERR-UNAUTHORIZED) (can-claim-tokens 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P u0 u1 unclaimed-rec (+ u1 reward-maturity))) (err u7))
        (asserts! (is-eq (err ERR-UNAUTHORIZED) (can-claim-tokens 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN u0 u0 unclaimed-rec (+ u1 reward-maturity))) (err u8))

        (asserts! (is-eq (err ERR-IMMATURE-TOKEN-REWARD) (can-claim-tokens 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN u0 u3 unclaimed-rec reward-maturity)) (err u9))
        (asserts! (is-eq (err ERR-ALREADY-CLAIMED) (can-claim-tokens 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P u0 u0 claimed-rec (+ u1 reward-maturity))) (err u10))

        (ok u0)
    ))
)

(define-private (test-can-mine-tokens)
    (let (
        (miners-rec {
            miners: (unwrap-panic (as-max-len? (list
                   { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 }
                   { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 }
                   { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 }
               ) u32)),
            claimed: false
        })
        (full-miners-rec {
            miners: (list
                   { miner: 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P, amount-ustx: u1 }
                   { miner: 'SP2M85H4NNNPQB0Y7GHT3K5EHWMRZWTHF2QAY1W69, amount-ustx: u2 }
                   { miner: 'SP3A33QYJK76BCDJJD11RYWZP9D62PVQXK2VF5TJN, amount-ustx: u3 }
                   { miner: 'SPEYQPWD6QPANV1FV0G6NXWP6KJT2F6B7PJMZNT4, amount-ustx: u4 }
                   { miner: 'SP15Q4SMZ9CBY6KR3XVEJ37CPQ5J1BMXDQKTCMGY7, amount-ustx: u5 }
                   { miner: 'SP25BWWBZSX1RMWFPN36MAHSV02242NTTV3SWST8C, amount-ustx: u6 }
                   { miner: 'SP1NCBWJEB9FZMTP4KW3KPAK2T6XV34SJ9X5J8G7H, amount-ustx: u7 }
                   { miner: 'SP29XBE4RRPBBVSQMZWKRB0J1EEJNTH883X1Y4CBS, amount-ustx: u8 }
                   { miner: 'SP1GY8PRRWDM87X61SKH411C9A67CBAV2G3P8JM3M, amount-ustx: u9 }
                   { miner: 'SP1WD70BZ4RQ046JF4EYV0NS1NNFXH115PG0P570V, amount-ustx: u10 }
                   { miner: 'SPTWZTJ4PVS00X1PM7YEAXCAC64MQQ8EKSYWF1ZY, amount-ustx: u11 }
                   { miner: 'SP9BH35SH9HRT9M6EVTSM0A5V35MR4EZ55B35QEW, amount-ustx: u12 }
                   { miner: 'SP1GC4CYYTWD516ZSC60CSBXCFWXYSP6GRJNVEP1S, amount-ustx: u13 }
                   { miner: 'SP20PT05Q35SR2HHEQ131SHSJ8339WWR75JMAN15K, amount-ustx: u14 }
                   { miner: 'SP1KHGJZ6DVK29MXDNC8CH6SP9D3VQMD5DGDHWKNW, amount-ustx: u15 }
                   { miner: 'SPBGS5AACHW8M7W8QEKSBA3241TTBTK3JZ9Z36ZK, amount-ustx: u16 }
                   { miner: 'SP4MKYT1P8X8ZT2ECG6X9TWBBMHDZMYHHH529C0Q, amount-ustx: u17 }
                   { miner: 'SPGJM94X65H3DN49VEQRQQT454R4EBGGZ9DD880H, amount-ustx: u18 }
                   { miner: 'SP3AWJXN3R8JFSNWFCXR3HND5R0Z98271ESDJGJ9, amount-ustx: u19 }
                   { miner: 'SP1SKBHY382YBAM9YCZ384ZFC3ZRMS6MBM94EQZZV, amount-ustx: u20 }
                   { miner: 'SP3M5ND3J2JE820X8VZ0FP9TZYTJZRRQG7GX158WH, amount-ustx: u21 }
                   { miner: 'SP1ZD2VXR93GN1JRPJFFDMTF13SKPZ4RDW8M5N7FH, amount-ustx: u22 }
                   { miner: 'SP26WS8W5ASCTQVWA2N873YXCXD2T5P9ZXFKMX7SM, amount-ustx: u23 }
                   { miner: 'SP1FDCJNMK2H0XXN2PAGPSCEJBGP5DARKC1K1QMHR, amount-ustx: u24 }
                   { miner: 'SPT00VPT4EXCMMET7RPFRAHSA86CF6QCY2254J9Q, amount-ustx: u25 }
                   { miner: 'SP1Z4RZ43E52G58DB17V1391BE1GMBJCEQFFNJJB8, amount-ustx: u26 }
                   { miner: 'SP3SZ8MD3TXGP9WXK3MV6DJB1GQS6FBJ09FF9HP7M, amount-ustx: u27 }
                   { miner: 'SP2HYRZ84BK63B4VBBEBBP10ABXW2YPDRN4MXKE9Q, amount-ustx: u28 }
                   { miner: 'SP1NTQSMCKRN8MF30FEV6GH6F6M351ZHAE85ZQM55, amount-ustx: u29 }
                   { miner: 'SP3E0K7RCVWF33RXPA1F22G4Y8TAHPP10RHYWXB2E, amount-ustx: u30 }
                   { miner: 'SPEKMXTCAEGD6AF1R7A2Q0H7VNKCP75VVC1AZQRQ, amount-ustx: u31 }
                   { miner: 'SP13CE341B30AQ52764A0HAZY32AFCJ5VYXEKQBZ1, amount-ustx: u32 }
               ),
            claimed: false
        })
    )
    (begin
        (print "test-can-mine-tokens")
        (asserts! (is-eq (err ERR-STACKING-NOT-AVAILABLE) (can-mine-tokens 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P u0 u0 miners-rec)) (err u0))
        (asserts! (is-eq (err ERR-ROUND-FULL) (can-mine-tokens 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P u10 u0 full-miners-rec)) (err u1))
        (asserts! (is-eq (err ERR-ALREADY-MINED) (can-mine-tokens 'SP1GYBXAJSEF8SY0ERKA068J93E3EGNTXHR98MM5P u10 u0 miners-rec)) (err u2))
        (asserts! (is-eq (err ERR-CANNOT-MINE) (can-mine-tokens 'SPT00VPT4EXCMMET7RPFRAHSA86CF6QCY2254J9Q u10 u0 miners-rec)) (err u3))
        (asserts! (is-eq (err ERR-INSUFFICIENT-BALANCE) (can-mine-tokens 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D u10 u1001 miners-rec)) (err u4))
        (asserts! (is-eq (ok true) (can-mine-tokens 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D u10 u1000 miners-rec)) (err u5))
        (ok true)
    ))
)

(define-private (test-can-stack-tokens)
    (begin
        (print "test-can-stack-tokens")
        (asserts! (is-eq (err ERR-STACKING-NOT-AVAILABLE) (can-stack-tokens 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D u1 u0 u2 u3)) (err u0))
        (asserts! (is-eq (err ERR-CANNOT-STACK) (can-stack-tokens 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D u1 u3 u2 u3)) (err u1))
        (asserts! (is-eq (err ERR-CANNOT-STACK) (can-stack-tokens 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D u1 u2 u30 u10000)) (err u3))
        (asserts! (is-eq (err ERR-CANNOT-STACK) (can-stack-tokens 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D u0 u2 u30 u1)) (err u4))
        (asserts! (is-eq (err ERR-INSUFFICIENT-BALANCE) (can-stack-tokens 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D u1 u2 u30 u1)) (err u5))
        (ok true)
    )
)

(define-private (test-get-entitled-stacking-reward)
    (let (
        (stacker-id 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D)
    )
    (begin
        (print "test-get-entitled-stacking-reward")
        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u0 u0)) (err u0))
        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u0 u1)) (err u1))
        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u1 u2)) (err u2))

        ;; mocked
        (map-set stacked-per-cycle
            { owner: stacker-id, reward-cycle: u1000 }
            { amount-token: u100 })

        ;; mocked
        (map-set tokens-per-cycle
            { reward-cycle: u1000 }
            { total-ustx: u300, total-tokens: u150 })
        
        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u0 u0)) (err u3))
        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u0 u1)) (err u4))
        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u1 u2)) (err u5))

        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u1000 u10)) (err u6))

        (asserts! (is-eq (/ (* u300 u100) u150) (get-entitled-stacking-reward stacker-id u1000 (get-first-block-height-in-reward-cycle u1001))) (err u7))

        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u1000 (+ u1 (get-first-block-height-in-reward-cycle u1000)))) (err u8))
        (asserts! (is-eq u0 (get-entitled-stacking-reward stacker-id u1000 (- (get-first-block-height-in-reward-cycle u1001) u1))) (err u9))

        ;; un-mock
        (map-delete stacked-per-cycle { owner: stacker-id, reward-cycle: u1000 })
        (map-delete tokens-per-cycle { reward-cycle: u1000 })
        (ok true)
    ))
)

(define-private (test-set-tokens-mined-and-claimed)
    (let (
        (miner-id 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D)
        (miner-id-2 'SP2HYRZ84BK63B4VBBEBBP10ABXW2YPDRN4MXKE9Q)
        (miner-id-3 'SP4MKYT1P8X8ZT2ECG6X9TWBBMHDZMYHHH529C0Q)
    )
    (begin
        (print "test-set-tokens-mined-and-claimed")

        (asserts! (is-eq none (map-get? miners { stacks-block-height: u1000 })) (err u0))
        (asserts! (is-eq none (map-get? tokens-per-cycle { reward-cycle: (unwrap-panic (get-reward-cycle u1000)) })) (err u1))

        (unwrap-panic (set-tokens-mined miner-id u1000 u1000))

        (asserts! (is-eq (some { miners: (unwrap-panic (as-max-len? (list { miner: miner-id, amount-ustx: u1000 }) u32)), claimed: false })
                         (map-get? miners { stacks-block-height: u1000 }))
            (err u2))
        (asserts! (is-eq (some { total-ustx: u1000, total-tokens: u0 })
                         (map-get? tokens-per-cycle { reward-cycle: (unwrap-panic (get-reward-cycle u1000)) }))
            (err u3))

        (unwrap-panic (set-tokens-mined miner-id-2 u1000 u200))

        (asserts! (is-eq (some { miners: (unwrap-panic (as-max-len? (list { miner: miner-id, amount-ustx: u1000 } { miner: miner-id-2, amount-ustx: u200 }) u32)), claimed: false })
                         (map-get? miners { stacks-block-height: u1000 }))
            (err u4))
        (asserts! (is-eq (some { total-ustx: u1200, total-tokens: u0 })
                         (map-get? tokens-per-cycle { reward-cycle: (unwrap-panic (get-reward-cycle u1000)) }))
            (err u5))

        (unwrap-panic (set-tokens-mined miner-id-3 u1000 u300))

        (asserts! (is-eq (some { miners: (unwrap-panic (as-max-len? (list { miner: miner-id, amount-ustx: u1000 } { miner: miner-id-2, amount-ustx: u200 } { miner: miner-id-3, amount-ustx: u300 }) u32)), claimed: false })
                         (map-get? miners { stacks-block-height: u1000 }))
            (err u6))
        (asserts! (is-eq (some { total-ustx: u1500, total-tokens: u0 })
                         (map-get? tokens-per-cycle { reward-cycle: (unwrap-panic (get-reward-cycle u1000)) }))
            (err u7))

        (asserts! (is-eq (err ERR-NO-WINNER) (set-tokens-claimed u123))
            (err u8))

        (asserts! (is-eq (ok true) (set-tokens-claimed u1000))
            (err u9))

        (asserts! (is-eq (some { miners: (unwrap-panic (as-max-len? (list { miner: miner-id, amount-ustx: u1000 } { miner: miner-id-2, amount-ustx: u200 } { miner: miner-id-3, amount-ustx: u300 }) u32)), claimed: true })
                         (map-get? miners { stacks-block-height: u1000 }))
            (err u10))
        
        (asserts! (is-eq (err ERR-ALREADY-CLAIMED) (set-tokens-claimed u1000))
            (err u11))

        (map-delete miners { stacks-block-height: u1000 })
        (map-delete tokens-per-cycle { reward-cycle: (unwrap-panic (get-reward-cycle u1000)) })

        (ok true)
    ))
)

(define-private (test-stack-tokens-closure)
    (let (
        (stacker-id-1 'SPP5ERW9P30ZQ9S7KGEBH042E7EJHWDT2Z5K086D)
        (stacker-id-2 'SP2HYRZ84BK63B4VBBEBBP10ABXW2YPDRN4MXKE9Q)
    )
    (begin
        (print "test-stack-tokens-closure")
        (asserts! (is-eq none (map-get? stacked-per-cycle { owner: stacker-id-1, reward-cycle: u1000 })) (err u0))
        (asserts! (is-eq none (map-get? stacked-per-cycle { owner: stacker-id-2, reward-cycle: u1000 })) (err u1))

        (asserts! (is-eq none (map-get? tokens-per-cycle { reward-cycle: u1000 })) (err u3))

        (stack-tokens-closure u0 { id: stacker-id-1, amt: u200, first: u1000, last: u1003 })
        (asserts! (is-eq (some { amount-token: u200 })
                         (map-get? stacked-per-cycle { owner: stacker-id-1, reward-cycle: u1000 }))
            (err u4))
        (asserts! (is-eq (some { total-ustx: u0, total-tokens: u200 })
                         (map-get? tokens-per-cycle { reward-cycle: u1000 }))
            (err u5))

        (stack-tokens-closure u1 { id: stacker-id-1, amt: u200, first: u1000, last: u1003 })
        (asserts! (is-eq (some { amount-token: u200 })
                         (map-get? stacked-per-cycle { owner: stacker-id-1, reward-cycle: u1001 }))
            (err u6))
        (asserts! (is-eq (some { total-ustx: u0, total-tokens: u200 })
                         (map-get? tokens-per-cycle { reward-cycle: u1001 }))
            (err u7))

        (stack-tokens-closure u2 { id: stacker-id-2, amt: u300, first: u998, last: u1001 })
        (asserts! (is-eq (some { amount-token: u300 })
                         (map-get? stacked-per-cycle { owner: stacker-id-2, reward-cycle: u1000 }))
            (err u8))
        (asserts! (is-eq (some { total-ustx: u0, total-tokens: u500 })
                         (map-get? tokens-per-cycle { reward-cycle: u1000 }))
            (err u9))

        (map-delete stacked-per-cycle { owner: stacker-id-1, reward-cycle: u1000 })
        (map-delete stacked-per-cycle { owner: stacker-id-2, reward-cycle: u1000 })
        (map-delete tokens-per-cycle { reward-cycle: u1000 })
        (ok true)
    ))
)
    
(define-public (unit-tests)
    (begin
        (try! (test-buff-to-u8))
        (try! (test-buff-to-uint-le))
        (try! (test-lower-16-le))
        (try! (test-get-block-commit-total))
        (try! (test-get-block-winner))
        (try! (test-has-mined-in-list))
        (try! (test-can-claim-tokens))
        (try! (test-can-mine-tokens))
        (try! (test-can-stack-tokens))
        (try! (test-get-entitled-stacking-reward))
        (try! (test-set-tokens-mined-and-claimed))
        (try! (test-stack-tokens-closure))
        (print "all tests pass")
        (ok u0)
    )
)

(define-public (block-5)
    (let (
        (rc (unwrap-panic (get-reward-cycle block-height)))
    )
    (begin
        (print "block-5: mine and stack tokens")

        (unwrap-panic (ft-mint? citycoins u100 tx-sender))

        (asserts! (is-eq u5 block-height)
            (err u0))

        (asserts! (is-eq u0 rc)
            (err u1))
        (asserts! (is-eq u0 (get-stacked-in-cycle tx-sender rc))
            (err u2))
        (asserts! (is-eq { total-ustx: u0, total-tokens: u0 } (get-tokens-per-cycle rc))
            (err u3))
        (asserts! (is-eq (unwrap-panic (as-max-len? (list ) u32)) (get-miners-at-block block-height))
            (err u4))

        (asserts! (is-eq (err ERR-CANNOT-MINE) (mine-tokens u0))
            (err u5))
        (asserts! (is-eq (ok true) (mine-tokens u1))
            (err u6))
        (asserts! (is-eq (err ERR-ALREADY-MINED) (mine-tokens u2))
            (err u7))

        (asserts! (is-eq (err ERR-CANNOT-STACK) (stack-tokens u0 (+ u1 block-height) u1))
            (err u8))
        (asserts! (is-eq (ok true) (stack-tokens u2 (+ u1 block-height) u1))
            (err u9))

        (asserts! (is-eq u0 (get-stacked-in-cycle tx-sender rc))
            (err u10))
        (asserts! (is-eq u2 (get-stacked-in-cycle tx-sender (+ u1 rc)))
            (err u11))
        (asserts! (is-eq { total-ustx: u1, total-tokens: u0 } (get-tokens-per-cycle rc))
            (err u12))
        (asserts! (is-eq { total-ustx: u0, total-tokens: u2 } (get-tokens-per-cycle (+ u1 rc)))
            (err u13))
        (asserts! (is-eq (unwrap-panic (as-max-len? (list { miner: tx-sender, amount-ustx: u1 }) u32)) (get-miners-at-block block-height))
            (err u14))

        (asserts! (is-eq (err ERR-IMMATURE-TOKEN-REWARD) (claim-token-reward u4))
            (err u15))
        (asserts! (is-eq (err ERR-NOTHING-TO-REDEEM) (claim-stacking-reward u1))
            (err u16))

        (ok u0)
    ))
)

(define-public (block-6)
    (let (
        (rc (unwrap-panic (get-reward-cycle block-height)))
    )
    (begin
        (print "block-6")
        (asserts! (is-eq u6 block-height)
            (err u0))
        (asserts! (is-eq u0 rc)
            (err u1))

        (asserts! (is-eq (err ERR-IMMATURE-TOKEN-REWARD) (claim-token-reward u4))
            (err u2))

        (asserts! (is-eq (err ERR-NOTHING-TO-REDEEM) (claim-stacking-reward u1))
            (err u3))

        (asserts! (is-eq (ok true) (mine-tokens u100))
            (err u4))

        (ok u0)
    ))
)

(define-public (block-7)
    (let (
        (rc (unwrap-panic (get-reward-cycle block-height)))
    )
    (begin
        (print "block-7")

        (asserts! (is-eq u7 block-height)
            (err u0))
        (asserts! (is-eq u1 rc)
            (err u1))

        (asserts! (is-eq (err ERR-IMMATURE-TOKEN-REWARD) (claim-token-reward u4))
            (err u2))

        (asserts! (is-eq (err ERR-NOTHING-TO-REDEEM) (claim-stacking-reward u1))
            (err u3))

        (asserts! (is-eq (ok true) (mine-tokens u1))
            (err u4))

        (ok u0)
    ))
)

(define-public (block-8)
    (let (
        (rc (unwrap-panic (get-reward-cycle block-height)))
    )
    (begin
        (print "block-8")

        (asserts! (is-eq u8 block-height)
            (err u0))
        (asserts! (is-eq u1 rc)
            (err u1))
        
        (asserts! (is-eq (err ERR-IMMATURE-TOKEN-REWARD) (claim-token-reward u5))
            (err u2))

        (asserts! (is-eq (err ERR-NOTHING-TO-REDEEM) (claim-stacking-reward u1))
            (err u3))

        (asserts! (is-eq (ok true) (mine-tokens u2))
            (err u4))

        (ok u0)
    ))
)

(define-public (block-9)
    (let (
        (initial-balance (ft-get-balance citycoins tx-sender))
        (rc (unwrap-panic (get-reward-cycle block-height)))
    )
    (begin
        (print "block-9")

        (var-set mining-is-active true)

        (asserts! (is-eq u9 block-height)
            (err u0))
        (asserts! (is-eq u1 rc)
            (err u1))

        (asserts! (is-eq (ok true) (claim-token-reward u5))
            (err u2))

        (asserts! (is-eq (+ initial-balance (get-coinbase-amount u4)) (ft-get-balance citycoins tx-sender))
            (err u3))

        (asserts! (is-eq (err ERR-NOTHING-TO-REDEEM) (claim-stacking-reward u1))
            (err u4))

        (asserts! (is-eq (ok true) (mine-tokens u3))
            (err u5))

        (ok u0)
    ))
)

(define-public (block-10)
    (let (
        (rc (unwrap-panic (get-reward-cycle block-height)))
    )
    (begin
        (print "block-10")

        (asserts! (is-eq u10 block-height)
            (err u0))
        (asserts! (is-eq u1 rc)
            (err u1))
        
        (asserts! (is-eq (err ERR-NOTHING-TO-REDEEM) (claim-stacking-reward u1))
            (err u2))

        (asserts! (is-eq (ok true) (mine-tokens u4))
            (err u3))

        (ok u0)
    ))
)

(define-public (block-11)
    (let (
        (rc (unwrap-panic (get-reward-cycle block-height)))
    )
    (begin
        (print "block-11")

        (asserts! (is-eq u11 block-height)
            (err u0))
        (asserts! (is-eq u1 rc)
            (err u1))

        (asserts! (is-eq (err ERR-NOTHING-TO-REDEEM) (claim-stacking-reward u1))
            (err u2))

        (asserts! (is-eq (ok true) (mine-tokens u5))
            (err u3))

        (ok u0)
    ))
)

(define-public (block-12)
    (let (
        (rc (unwrap-panic (get-reward-cycle block-height)))
        (stx-before (stx-get-balance tx-sender))
    )
    (begin
        (print "block-12")

        (asserts! (is-eq u12 block-height)
            (err u0))
        (asserts! (is-eq u2 rc)
            (err u1))

        (asserts! (is-eq (ok true) (claim-stacking-reward u1))
            (err u2))

        (asserts! (is-eq (+ u1 u2 u3 u4 u5 stx-before) (stx-get-balance tx-sender))
            (err u3))

        (ok u0)
    ))
)
