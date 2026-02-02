-- ================================================================
-- 회원 자격증 일괄 할당 SQL 스크립트
-- 생성일: 2026-02-02
-- ================================================================

-- 먼저 회원 존재 여부 확인
-- profiles 테이블에서 이름으로 회원 검색
DO $$
DECLARE
    member_names TEXT[] := ARRAY[
        '박수원', '김민서2', '정민주', '김보라', '양지현', '김영서', '윤유정', '박가현',
        '문혜진', '한주연', '김단비', '조아현', '심규환', '이두현', '신승훈', '박지훈',
        '이주원', '서지은', '정승한', '이다원', '정자윤', '김원규', '이동호', '강흥원',
        '김다윗', '강서정', '남지정', '황성재', '민병철', '박수민', '김채현', '황지윤',
        '설예진', '이유진', '윤성하', '최서진', '전우진', '손세형', '채성화', '이예성',
        '정근혁', '김민서3', '전지윤', '김해인', '김범진', '김규리', '이가은',
        '손지현', '송민영', '김민준', '김기태', '박상현', '한유주', '김예나', '엄승환',
        '김지현', '김부승', '이종우', '장수인', '이수빈', '남태우', '남동균', '정경민',
        '장혜지', '김송이', '김보해', '박선주', '김경섭', '이도현', '하재우', '김융',
        '양가윤', '성시영', '최영'
    ];
    member_name TEXT;
    found_id UUID;
    missing_names TEXT := '';
BEGIN
    RAISE NOTICE '=== 누락된 회원 확인 ===';
    
    FOREACH member_name IN ARRAY member_names
    LOOP
        SELECT id INTO found_id FROM public.profiles WHERE profiles.name = member_name LIMIT 1;
        IF found_id IS NULL THEN
            missing_names := missing_names || member_name || ', ';
        END IF;
    END loop;
    
    IF missing_names != '' THEN
        RAISE NOTICE '누락된 회원: %', missing_names;
    ELSE
        RAISE NOTICE '모든 회원이 데이터베이스에 존재합니다!';
    END IF;
END $$;

-- ================================================================
-- 자격증 할당 (회원이 확인되면 아래 스크립트 실행)
-- assign_user_certificate 함수 사용
-- ================================================================

-- 박수원 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '박수원' LIMIT 1), '회계사');

-- 김민서2 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김민서2' LIMIT 1), '회계사');

-- 정민주 - 경찰
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '정민주' LIMIT 1), '경찰');

-- 김보라 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김보라' LIMIT 1), '회계사');

-- 양지현 - 변호사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '양지현' LIMIT 1), '변호사');

-- 김영서 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김영서' LIMIT 1), '회계사');

-- 윤유정 - 7급우정
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '윤유정' LIMIT 1), '7급우정');

-- 박가현 - 감정평가사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '박가현' LIMIT 1), '감정평가사');

-- 문혜진 - 공무원
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '문혜진' LIMIT 1), '공무원');

-- 한주연 - 변호사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '한주연' LIMIT 1), '변호사');

-- 김단비 - 9급고용노동
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김단비' LIMIT 1), '9급고용노동');

-- 조아현 - 취업
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '조아현' LIMIT 1), '취업');

-- 심규환 - 검찰직
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '심규환' LIMIT 1), '검찰직');

-- 이두현 - 소방
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이두현' LIMIT 1), '소방');

-- 신승훈 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '신승훈' LIMIT 1), '회계사');

-- 박지훈 - 감정평가사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '박지훈' LIMIT 1), '감정평가사');

-- 이주원 - 편입
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이주원' LIMIT 1), '편입');

-- 서지은 - 토목직공무원
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '서지은' LIMIT 1), '토목직공무원');

-- 정승한 - 공기업
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '정승한' LIMIT 1), '공기업');

-- 이다원 - 손해사정사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이다원' LIMIT 1), '손해사정사');

-- 정자윤 - 변리사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '정자윤' LIMIT 1), '변리사');

-- 김원규 - 로스쿨
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김원규' LIMIT 1), '로스쿨');

-- 이동호 - 세무직
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이동호' LIMIT 1), '세무직');

-- 강흥원 - 노무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '강흥원' LIMIT 1), '노무사');

-- 김다윗 - 5급공채
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김다윗' LIMIT 1), '5급공채');

-- 강서정 - 노무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '강서정' LIMIT 1), '노무사');

-- 남지정 - 공기업
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '남지정' LIMIT 1), '공기업');

-- 황성재 - 변리사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '황성재' LIMIT 1), '변리사');

-- 민병철 - 소방
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '민병철' LIMIT 1), '소방');

-- 박수민 - 세무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '박수민' LIMIT 1), '세무사');

-- 김채현 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김채현' LIMIT 1), '회계사');

-- 황지윤 - 일행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '황지윤' LIMIT 1), '일행');

-- 설예진 - 일행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '설예진' LIMIT 1), '일행');

-- 이유진 - 역사임용
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이유진' LIMIT 1), '역사임용');

-- 윤성하 - 공기업
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '윤성하' LIMIT 1), '공기업');

-- 최서진 - 보험계리사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '최서진' LIMIT 1), '보험계리사');

-- 전우진 - 경찰
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '전우진' LIMIT 1), '경찰');

-- 손세형 - 9급일행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '손세형' LIMIT 1), '9급일행');

-- 채성화 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '채성화' LIMIT 1), '회계사');

-- 이예성 - 9급일행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이예성' LIMIT 1), '9급일행');

-- 정근혁 - 노무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '정근혁' LIMIT 1), '노무사');

-- 김민서3 - 소방
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김민서3' LIMIT 1), '소방');

-- 전지윤 - 9급일행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '전지윤' LIMIT 1), '9급일행');

-- 임수아 - 수능 (❌ DB에 없음)
-- SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '임수아' LIMIT 1), '수능');

-- 김해인 - 은행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김해인' LIMIT 1), '은행');

-- 김범진 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김범진' LIMIT 1), '회계사');

-- 김규리 - 9급일행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김규리' LIMIT 1), '9급일행');

-- 이가은 - 수능
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이가은' LIMIT 1), '수능');

-- 손지현 - 경찰
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '손지현' LIMIT 1), '경찰');

-- 송민영 - 약대편입
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '송민영' LIMIT 1), '약대편입');

-- 김민준 - 경찰
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김민준' LIMIT 1), '경찰');

-- 김기태 - 세무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김기태' LIMIT 1), '세무사');

-- 박상현 - 감정평가사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '박상현' LIMIT 1), '감정평가사');

-- 한유주 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '한유주' LIMIT 1), '회계사');

-- 김예나 - 관세사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김예나' LIMIT 1), '관세사');

-- 엄승환 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '엄승환' LIMIT 1), '회계사');

-- 김지현 - 감정평가사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김지현' LIMIT 1), '감정평가사');

-- 김부승 - 부산교통공사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김부승' LIMIT 1), '부산교통공사');

-- 이종우 - 소방
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이종우' LIMIT 1), '소방');

-- 장수인 - 세무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '장수인' LIMIT 1), '세무사');

-- 이수빈 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이수빈' LIMIT 1), '회계사');

-- 남태우 - 9급교행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '남태우' LIMIT 1), '9급교행');

-- 남동균 - 감정평가사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '남동균' LIMIT 1), '감정평가사');

-- 정경민 - 회계사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '정경민' LIMIT 1), '회계사');

-- 김민서 - 회계사 (❌ DB에 없음)
-- SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김민서' LIMIT 1), '회계사');

-- 장혜지 - 수능
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '장혜지' LIMIT 1), '수능');

-- 김송이 - 세무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김송이' LIMIT 1), '세무사');

-- 김보해 - 감정평가사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김보해' LIMIT 1), '감정평가사');

-- 박선주 - 노무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '박선주' LIMIT 1), '노무사');

-- 김경섭 - 세무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김경섭' LIMIT 1), '세무사');

-- 이도현 - 경찰
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '이도현' LIMIT 1), '경찰');

-- 하재우 - 노무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '하재우' LIMIT 1), '노무사');

-- 김융 - 세무사
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '김융' LIMIT 1), '세무사');

-- 양가윤 - 9급일행
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '양가윤' LIMIT 1), '9급일행');

-- 성시영 - 경찰
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '성시영' LIMIT 1), '경찰');

-- 최영 - 세무직
SELECT assign_user_certificate((SELECT id FROM profiles WHERE name = '최영' LIMIT 1), '세무직');


-- ================================================================
-- 결과 확인
-- ================================================================
SELECT 
    p.name as 회원명, 
    ARRAY_AGG(co.name) as 준비중인_자격증
FROM public.profiles p
LEFT JOIN public.user_certificates uc ON p.id = uc.user_id
LEFT JOIN public.certificate_options co ON uc.certificate_id = co.id
WHERE co.name IS NOT NULL
GROUP BY p.name
ORDER BY p.name;
