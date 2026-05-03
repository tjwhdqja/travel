import { useState } from 'react'
import AIResultPanel from '../components/AIResultPanel'
import { btn } from '../lib/design'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string

interface PlaceItem {
  name: string
  desc: string
  tip?: string
}

interface GuideData {
  attractions: PlaceItem[]
  restaurants: PlaceItem[]
  bars: PlaceItem[]
  activities: PlaceItem[]
}

const GUIDE: Record<string, GuideData> = {
  도쿄: {
    attractions: [
      { name: '아사쿠사·센소지', desc: '도쿄에서 가장 오래된 사원, 나카미세 쇼핑거리', tip: '새벽 5-7시가 인파 없어 조용함' },
      { name: '시부야 스크램블 교차로', desc: '세계에서 가장 붐비는 교차로, 야경 추천', tip: '스타벅스 2층에서 내려다보기 좋음' },
      { name: '신주쿠 교엔', desc: '광활한 도심 공원, 봄 벚꽃 명소' },
      { name: '우에노 공원', desc: '박물관·미술관·동물원 밀집, 문화 허브' },
      { name: '오다이바', desc: '레인보우 브릿지 야경, 쇼핑몰, 건담 동상' },
      { name: '메이지 신궁', desc: '하라주쿠 옆 울창한 숲 속 신사' },
    ],
    restaurants: [
      { name: '쓰키지 시장 주변 스시집', desc: '현지인이 즐겨 찾는 카운터 오마카세', tip: '오전 7-9시가 신선도 최고' },
      { name: '이치란 라멘 (토쿄역점)', desc: '1인 칸막이 개인 라멘, 농도 직접 조절' },
      { name: '카이텐즈시 네무로 하나마루', desc: '홋카이도식 회전초밥, 가성비 최고' },
      { name: 'とんかつ 마이센 (아오야마)', desc: '1960년대부터 이어온 돈카츠 명가' },
      { name: '野むら山荘 (노무라 산소)', desc: '신주쿠 이자카야 골목 숨은 이자카야' },
      { name: 'もつ焼き ばん (아메요코)', desc: '우에노 현지인 곱창구이 노포' },
    ],
    bars: [
      { name: '골든 가이 (신주쿠)', desc: '좁은 골목에 200여 개 미니바, 진짜 도쿄 바 문화', tip: '바마다 10-20석 내외, 문 열기 전 줄 서기' },
      { name: '롯폰기 힐스 바', desc: '도심 야경과 함께하는 루프탑 바' },
      { name: '토리스 바 (우에노)', desc: '현지 직장인 하이볼 문화, 저렴한 가격' },
      { name: '나카메구로 리버사이드 바', desc: '목강변 테라스, 벚꽃 시즌에 특히 인기' },
    ],
    activities: [
      { name: '팀랩 보더리스', desc: '몰입형 디지털 아트 뮤지엄, 예약 필수' },
      { name: '도쿄 스카이트리 전망대', desc: '634m 세계 최고층 전파탑, 야경 추천' },
      { name: '하라주쿠 다케시타 거리', desc: '크레이프·개성 패션·서브컬처 쇼핑' },
      { name: '아키하바라 전자거리', desc: '가전·피규어·애니메이션 굿즈 쇼핑' },
      { name: '요코하마 차이나타운', desc: '일본 최대 차이나타운, 중화요리 투어' },
    ],
  },
  오사카: {
    attractions: [
      { name: '도톤보리', desc: '네온사인과 먹거리가 밀집한 오사카 상징 거리', tip: '글리코 맨 앞에서 인증샷 필수' },
      { name: '오사카성', desc: '16세기 역사 성곽과 넓은 공원, 야경도 아름다움' },
      { name: '신세카이·쓰텐카쿠', desc: '레트로 분위기, 쿠시카츠(꼬치튀김) 발상지' },
      { name: '아메리카무라', desc: '빈티지·스트리트 패션, 젊은 문화 허브' },
      { name: '나카노시마 공원', desc: '강 사이 섬에 위치한 아름다운 공원' },
    ],
    restaurants: [
      { name: '쿠로몬 시장', desc: '오사카의 부엌, 신선한 해산물·현지 먹거리', tip: '아침 일찍 방문 권장' },
      { name: '다코야키 아이즈야 (신사이바시)', desc: '1933년 창업 원조 타코야키 노포' },
      { name: '오코노미야키 미즈노', desc: '오사카식 오코노미야키 명가, 현지인 줄서기' },
      { name: '하나다코 (도톤보리)', desc: '현지인 추천 문어빵, 저렴하고 맛있음' },
      { name: '이치부시보시 (고베 비프)', desc: '쿠로몬 시장 근처 고베규 구이' },
    ],
    bars: [
      { name: '호젠지 요코초', desc: '이끼 낀 좁은 골목 이자카야 밀집지, 오사카 노포 바 문화' },
      { name: '키타 신치', desc: '오사카 최고급 바·클럽 지역, 현지 비즈니스맨 단골' },
      { name: '아메무라 바 거리', desc: '젊은층 대상 칵테일바, DJ바 밀집' },
    ],
    activities: [
      { name: '유니버설 스튜디오 재팬', desc: '해리포터·마리오 월드 등 대형 테마파크, 사전 예약 필수' },
      { name: '아쿠아리움 카이유칸', desc: '세계 최대급 수족관, 고래상어 전시' },
      { name: '쿠라시키 미관지구 당일치기', desc: '오사카에서 1시간, 에도시대 창고 마을' },
      { name: '난바 쇼핑', desc: '도톤보리·신사이바시 쇼핑 아케이드 투어' },
    ],
  },
  방콕: {
    attractions: [
      { name: '왓 프라 케우 (에메랄드 사원)', desc: '태국 왕궁 내 최고 성지, 에메랄드 불상 모셔', tip: '반바지 입장 불가, 입구에서 천 대여 가능' },
      { name: '왓 아룬 (새벽사원)', desc: '짜오프라야 강변 도자기 타일 장식 사원' },
      { name: '짜뚜짝 주말시장', desc: '세계 최대 야외시장, 토·일만 운영' },
      { name: '카오산 로드', desc: '배낭여행자 성지, 노점·바·마사지숍 밀집' },
      { name: '짐 톰슨 하우스', desc: '전통 태국 건축 보존 박물관' },
    ],
    restaurants: [
      { name: '쏨땀 누아 (씨암)', desc: '현지인·관광객 모두 줄 서는 쏨땀 맛집' },
      { name: '제이 파이 (미쉐린 스트리트)', desc: '100년 역사 팟키마오·게살 오믈렛, 새벽 오픈' },
      { name: '크루아 압쏜 (왕궁 근처)', desc: '현지 직장인 점심 맛집, 정통 타이 가정식' },
      { name: '또르 코르 시장 내 식당', desc: '최고급 식재료 시장, 과일·반찬 즉석 조리' },
      { name: '보트 누들 앨리 (빅토리 모뉴먼트)', desc: '선상 국수 전통 이어받은 작은 면집 골목' },
    ],
    bars: [
      { name: 'RCA (Royal City Avenue)', desc: '현지 젊은층 클럽·바 밀집, 태국 클럽 문화 체험' },
      { name: '쏘이 38 이하이 타워', desc: '루프탑 바 밀집 지역, 방콕 야경 감상' },
      { name: '텝바 (차이나타운 근처)', desc: '창고 개조 라이브 음악 바, 현지인 핫플' },
      { name: '아리 바 거리', desc: '로컬 힙스터들의 저렴한 칵테일 바 거리' },
    ],
    activities: [
      { name: '짜오프라야 수상버스', desc: '강따라 주요 사원 이동, 현지인과 함께 탑승' },
      { name: '무에타이 관람 (룸피니 스타디움)', desc: '진짜 무에타이 경기 직관, 생생한 현지 문화' },
      { name: '쿠킹 클래스', desc: '태국 요리 반나절 클래스, 시장 투어 포함' },
      { name: '아유타야 당일치기', desc: '방콕에서 1.5시간, 유네스코 고대 수도 유적' },
      { name: '왓포 타이 마사지 학교', desc: '원조 왓포 마사지, 2시간 코스 저렴함' },
    ],
  },
  파리: {
    attractions: [
      { name: '에펠탑', desc: '파리의 상징, 야간 조명쇼 매시간 정각', tip: '줄 피하려면 2층까지 계단으로' },
      { name: '루브르 박물관', desc: '세계 최대 미술관, 모나리자·비너스 상', tip: '수·금 야간 개장으로 줄이 짧음' },
      { name: '몽마르트르 언덕·사크레쾨르', desc: '화가의 거리, 파리 전경 조망' },
      { name: '오르세 미술관', desc: '인상파 회화 명작, 고흐·모네·르누아르' },
      { name: '마레 지구', desc: '중세 건물 속 트렌디한 카페·갤러리' },
    ],
    restaurants: [
      { name: '르 뒤 마고 (생제르맹)', desc: '사르트르가 단골이었던 100년 넘은 카페' },
      { name: '랑 블레 (오베르캉프)', desc: '현지인 즐겨 찾는 소규모 비스트로, 예약 필수' },
      { name: '마르쉐 다리그르 시장', desc: '파리 최대 재래시장, 신선 식재료·스트리트 푸드' },
      { name: '스테이크프리트 르릴레', desc: '파리 현지인 사랑하는 스테이크 & 감자튀김 전문점' },
      { name: '폴리도르 (라탱 지구)', desc: '1845년 개업, 문인들의 식당, 정통 프랑스 가정식' },
    ],
    bars: [
      { name: '오베르캉프 바 거리', desc: '파리 젊은층 야간 문화, 소규모 와인바·칵테일바' },
      { name: '르 카르고 (생폴 근처)', desc: '현지 예술가·직장인 아페리티프 문화' },
      { name: '피갈 바 거리', desc: '최근 젠트리피케이션으로 힙한 바 급증' },
      { name: '카브 드 라 보에시', desc: '마레 지구 와인 바, 현지 자연주의 와인 전문' },
    ],
    activities: [
      { name: '센강 유람선 (바토 무슈)', desc: '1시간 야경 크루즈, 주요 명소 감상' },
      { name: '베르사유 궁전 당일치기', desc: 'RER C로 35분, 거대한 왕궁과 정원' },
      { name: '파리 자전거 투어', desc: '도심을 자전거로, 이색 뷰포인트 발견' },
      { name: '벼룩시장 (클리냥쿠르)', desc: '토·일·월, 유럽 최대 앤티크 마켓' },
      { name: '와인 시음 클래스', desc: '마레 지구 소규모 와인 클래스, 소믈리에 진행' },
    ],
  },
  뉴욕: {
    attractions: [
      { name: '센트럴파크', desc: '도심 속 거대 공원, 조깅·피크닉·보트타기' },
      { name: '메트로폴리탄 미술관', desc: '세계 3대 미술관, 5000년 인류 문화재' },
      { name: '브루클린 브릿지', desc: '도보 산책 코스, 맨해튼 스카이라인 뷰' },
      { name: '하이라인 파크', desc: '폐철도 위 공중 정원, 허드슨야드 야경' },
      { name: '타임스퀘어', desc: '세계 최고 밀집 광고판, 야간이 압도적' },
    ],
    restaurants: [
      { name: 'Xi\'an Famous Foods (이스트빌리지)', desc: '도수로 비빔면·양고기 국수, 현지 직장인 점심' },
      { name: 'Lucali (캐롤 가든스)', desc: '브루클린 현지인 No.1 피자, 예약 없이 줄서기' },
      { name: 'Katz\'s Deli', desc: '1888년 오픈 유대인 델리, 파스트라미 샌드위치 전설' },
      { name: 'Di Fara Pizza (미드우드)', desc: '80년 넘은 피자 노포, 주인 할아버지 직접 만듦' },
      { name: 'Superiority Burger (이빌)', desc: '채식 버거 명소, 현지인 줄서는 맛집' },
    ],
    bars: [
      { name: '이스트빌리지 바 거리 (9번가)', desc: '다양한 콘셉트 바 밀집, 뉴요커 스타일 바 문화' },
      { name: 'Employees Only (웨스트빌리지)', desc: '세계 50대 바, 금주령 시대 분위기 칵테일바' },
      { name: '윌리엄스버그 루프탑 바', desc: '맨해튼 야경 감상 최적, 여름 시즌 인기' },
      { name: 'McSorley\'s Old Ale House', desc: '1854년 오픈, 뉴욕 현존 최고령 바' },
    ],
    activities: [
      { name: '자유의 여신상 페리', desc: '스태튼 아일랜드 무료 페리로 여신상 조망 가능' },
      { name: '브로드웨이 뮤지컬', desc: 'TKTS에서 당일 할인권 구매, 고전·신작 모두 가능' },
      { name: '첼시 마켓', desc: '음식 홀·쇼핑 복합공간, 현지 먹거리 투어' },
      { name: '코니아일랜드', desc: '브루클린 해변 유원지, 핫도그 네이션스·놀이기구' },
      { name: '뉴욕 현대미술관 (MoMA)', desc: '고흐 별이 빛나는 밤 원화 소장, 금요일 무료입장' },
    ],
  },
  발리: {
    attractions: [
      { name: '따나 롯 사원', desc: '바다 위 암초 위 사원, 일몰 시간 방문 추천' },
      { name: '우붓 왕궁·원숭이 숲', desc: '발리 문화 중심지, 500여 마리 원숭이 서식' },
      { name: '뜨갈랄랑 라이스 테라스', desc: '계단식 논밭 조망, 이른 아침 안개 풍경' },
      { name: '꾸따 비치', desc: '서핑 초보에게 최적, 해변 선셋 명소' },
      { name: '울루와뚜 사원', desc: '절벽 끝 사원, 일몰 케착 댄스 공연' },
    ],
    restaurants: [
      { name: 'Warung Babi Guling Ibu Oka (우붓)', desc: '현지인 베이비 피그 로스트, 오전에 재료 소진됨' },
      { name: 'Naughty Nuri\'s (우붓)', desc: '발리 현지인·장기체류자 단골 BBQ 립' },
      { name: 'Canggu 지역 와룽', desc: '서퍼 거리 저렴한 현지 음식, 나시고렝·미고렝' },
      { name: 'Merah Putih (스미냑)', desc: '발리 모던 인도네시아 요리, 예쁜 인테리어' },
    ],
    bars: [
      { name: 'La Favela (스미냑)', desc: '정글 느낌 실내, 발리 클럽 문화 중심지' },
      { name: 'Single Fin (울루와뚜)', desc: '절벽 위 서핑 뷰 선셋 바, 일요일 라이브' },
      { name: 'Motel Mexicola', desc: '화려한 멕시칸 파티 바, 마가리타 유명' },
      { name: '짱구 바 거리', desc: '서퍼·디지털 노마드 문화, 저렴하고 캐주얼한 바' },
    ],
    activities: [
      { name: '서핑 레슨 (꾸따·짱구)', desc: '초보자 반나절 레슨, 80-150K 루피아' },
      { name: '화이트워터 래프팅 (아융강)', desc: '우붓 근처 2시간 래프팅, 열대 우림 경관' },
      { name: '발리 요가 클래스', desc: '우붓 요가 번, 아침 선라이즈 클래스 인기' },
      { name: '발리 요리 클래스', desc: '시장 투어 후 발리 전통 음식 만들기' },
      { name: '마운트 바투르 선라이즈 트레킹', desc: '새벽 2시 출발, 정상에서 일출 감상' },
    ],
  },
  싱가포르: {
    attractions: [
      { name: '마리나베이 샌즈', desc: '수영장이 있는 57층 루프탑, 스펙타클한 야경' },
      { name: '가든스 바이 더 베이', desc: '슈퍼트리 야간 조명쇼 매일 7:45, 9:45pm' },
      { name: '클락키', desc: '운하변 클럽·바·레스토랑 밀집, 싱가포르 야경 명소' },
      { name: '차이나타운·리틀인디아', desc: '싱가포르 문화 다양성, 로컬 음식 탐방' },
      { name: '유니버설 스튜디오 싱가포르', desc: '동남아 유일 유니버설, 센토사섬 내 위치' },
    ],
    restaurants: [
      { name: '맥스웰 푸드센터', desc: '현지인 1순위 호커센터, 티엔티엔 치킨라이스 유명' },
      { name: '라우파삿 호커센터', desc: '야간 사테 거리로 유명, 저녁 6시 이후 야외 바베큐' },
      { name: '점보 씨푸드 (클락키)', desc: '칠리크랩·블랙페퍼크랩, 현지인도 즐겨 찾음', tip: '1-2일 전 예약 권장' },
      { name: '토스트박스', desc: '카야토스트·코피 (싱가포르 로컬 커피), 현지인 아침 문화' },
      { name: '뉴튼 푸드센터', desc: '심야까지 운영, 다양한 현지 음식 한곳에' },
    ],
    bars: [
      { name: '레벨33 루프탑 바', desc: '세계 최고층 크래프트 맥주 양조장, CBD 전망' },
      { name: '아틱 루프탑 바 (파르시칸)', desc: '싱가포르 야경 최고 뷰포인트 중 하나' },
      { name: '앤 색스 (클락키)', desc: '재즈 라이브 바, 분위기 있는 싱가포르 칵테일 문화' },
      { name: '다운타운 이스트 클럽 거리', desc: '젊은층 클럽 밀집, 금·토 심야까지 운영' },
    ],
    activities: [
      { name: '센토사 실로소 비치', desc: '도심 30분 거리 깨끗한 해변, 케이블카 탑승 가능' },
      { name: '리버 사파리', desc: '세계 유일 강 주제 동물원, 판다 전시' },
      { name: '스카이라인 루지 센토사', desc: '곤돌라 타고 올라가서 루지로 내려오는 액티비티' },
      { name: '싱가포르 플라이어 (대관람차)', desc: '165m 세계 최대 대관람차, 말레이시아까지 조망' },
      { name: '헬릭스 브릿지 & 아트사이언스 뮤지엄', desc: 'DNA 모양 보행교와 미래형 미술관' },
    ],
  },
  홍콩: {
    attractions: [
      { name: '빅토리아 피크', desc: '홍콩 최고 뷰포인트, 트램 탑승 추천', tip: '흐린 날은 아무것도 안 보임, 날씨 확인 필수' },
      { name: '몽콕 나이트마켓', desc: '여성 시장·금붕어 시장·화훼시장, 로컬 분위기' },
      { name: '란콰이퐁', desc: '홍콩 바·클럽 밀집 거리, 외국인과 현지인 혼재' },
      { name: '템플 스트리트 나이트마켓', desc: '점술·노천 광둥 오페라·저렴한 야식' },
      { name: '침사추이 해안 산책로', desc: '홍콩 섬 스카이라인 야경 감상 최고 포인트' },
    ],
    restaurants: [
      { name: '팀호완 딤섬 (몽콕)', desc: '세계에서 가장 저렴한 미쉐린 딤섬 레스토랑' },
      { name: '미도 카페 (조던)', desc: '1950년대 분위기 전통 홍콩 차찬텡, 프렌치토스트' },
      { name: '라이 온 로드 야시장 노점', desc: '커리 피시볼·스팀드 에그 와플, 현지 간식 투어' },
      { name: '스프링문 (침사추이)', desc: '현지인 즐겨 찾는 광둥식 해산물 레스토랑' },
      { name: '로컬 차찬텡', desc: '홍콩 스타일 밀크티·에그 타르트·파인애플빵' },
    ],
    bars: [
      { name: '오조나 루프탑 바 (침사추이)', desc: '홍콩 섬 조망 루프탑, 선셋 타임이 최고' },
      { name: '란콰이퐁 바 거리', desc: '홍콩 최대 바 밀집, 다양한 국적 혼재 분위기' },
      { name: '웨스 (완차이)', desc: '로컬 힙스터 바, 저렴한 맥주와 라이브 음악' },
    ],
    activities: [
      { name: '스타페리 야간 크루즈', desc: '채 2달러에 빅토리아항 야경, 홍콩 최고 가성비' },
      { name: '란타우 섬·천단대불', desc: '케이블카로 오르는 34m 청동 대불, 1일 코스' },
      { name: 'MTR 로컬 투어', desc: '지하철 1일 패스로 각 지구 특색 체험' },
      { name: '마카오 당일치기', desc: '페리 1시간, 카지노·역사지구·에그타르트 투어' },
    ],
  },
  바르셀로나: {
    attractions: [
      { name: '사그라다 파밀리아', desc: '가우디의 미완성 대성당, 2026년 완공 예정', tip: '내부 예약 없으면 입장 불가, 꼭 사전 예매' },
      { name: '구엘 공원', desc: '가우디 설계 공원, 모자이크 도마뱀 분수' },
      { name: '라 람블라 거리', desc: '바르셀로나 중심 보행로, 플라멩코·거리 공연' },
      { name: '고딕 지구', desc: '2000년 역사 중세 미로 골목, 피카소 미술관 인접' },
      { name: '보르네 지구', desc: '트렌디한 카페·갤러리·타파스 바 밀집' },
    ],
    restaurants: [
      { name: '라 보케리아 시장', desc: '람블라 거리 내 시장, 하몬·올리브·신선 과일' },
      { name: 'Bar del Pla (고딕지구)', desc: '현지인 줄 서는 타파스 바, 크로케타가 최고' },
      { name: 'El Xampanyet (보르네)', desc: '1929년 오픈 카바 바, 현지인 아페리티프 명소' },
      { name: '바르셀로네타 해산물 레스토랑', desc: '해변가 파에야·해산물, 현지인은 점심만' },
      { name: '그라시아 지구 타파스 투어', desc: '현지인 동네 타파스 바 호핑, 저녁 9시 이후 생동감' },
    ],
    bars: [
      { name: '엘 보른 칵테일 바 거리', desc: '좁은 골목 칵테일 바, 바르셀로나 밤문화 시작점' },
      { name: '로팍스 루프탑 (카탈루냐 광장 근처)', desc: '도심 야경 루프탑 바' },
      { name: '마레마그눔 클럽 (항구)', desc: '밤 2시 이후 달아오르는 항구 클럽' },
    ],
    activities: [
      { name: '플라멩코 공연 관람', desc: '타블라오에서 생공연, 저녁 8-10시 시작' },
      { name: '캄 노우 스타디움 투어', desc: 'FC 바르셀로나 홈구장, 경기일 티켓은 6개월 전' },
      { name: '몬주익 성 & 케이블카', desc: '항구 조망, 올림픽 시설 견학' },
      { name: '시체스 해변 당일치기', desc: '열차 30분, 조용하고 아름다운 해변 마을' },
    ],
  },
  로마: {
    attractions: [
      { name: '콜로세움·포로 로마노', desc: '2000년 역사 원형 경기장, 사전 예약 필수', tip: '무료 가이드 앱 다운로드 추천' },
      { name: '트레비 분수', desc: '동전 던지며 소원 빌기, 야간이 더 아름다움' },
      { name: '바티칸 박물관·시스티나 예배당', desc: '미켈란젤로 천지창조 원화 감상, 오전 일찍 방문' },
      { name: '판테온', desc: '2000년 전 건물, 돔 중앙 구멍으로 빛 쏟아짐' },
      { name: '보르게세 미술관', desc: '베르니니 조각 컬렉션, 예약제 소규모 운영' },
    ],
    restaurants: [
      { name: 'Tonnarello (트라스테베레)', desc: '현지 로마인 단골 트라토리아, 카르보나라 원조 스타일' },
      { name: 'Flavio al Velavevodetto', desc: '로마 현지인 1순위 카르보나라·카초에페페' },
      { name: 'Roscioli 살루메리아', desc: '치즈·하몬 가게 겸 레스토랑, 와인 리스트 방대' },
      { name: '피자 바이 더 슬라이스 (피자 알 탈리오)', desc: '현지 직장인 점심, 무게로 파는 로마식 피자' },
      { name: '트라스테베레 저녁 산책 식사', desc: '골목 식당 야외 테이블, 로마 저녁 문화 체험' },
    ],
    bars: [
      { name: '트라스테베레 바 골목', desc: '로마 현지 젊은층 아페리티포 문화, 저렴하고 활기참' },
      { name: '캄포 데 피오리 광장 바', desc: '저녁부터 심야까지 바 문화, 광장 분위기' },
      { name: '프라티 지구 에노테카', desc: '바티칸 근처 현지 와인바, 로마 와인 문화' },
    ],
    activities: [
      { name: '자전거로 아피아 가도', desc: '고대 로마 가도 자전거 투어, 카타콤베 방문' },
      { name: '파스타 만들기 클래스', desc: '현지 셰프와 홈 쿠킹 클래스, 소규모 운영' },
      { name: '오스티아 안티카 당일치기', desc: '로마 근교 해안 도시 유적, 콜로세움보다 덜 붐빔' },
    ],
  },
  나트랑: {
    attractions: [
      { name: '혼쫑 곶', desc: '기암 바위 해안, 나트랑 해변 전망', tip: '반나절 코스로 적합' },
      { name: '포나가르 참 탑', desc: '2세기 힌두 탑, 나트랑에서 가장 오래된 유적' },
      { name: '빈원더스 테마파크', desc: '혼 트레 섬 내 워터파크·놀이기구, 케이블카 탑승' },
      { name: '나트랑 비치', desc: '7km 해변, 카이트서핑·선베드·해변 마사지' },
    ],
    restaurants: [
      { name: '분보 후에 현지 식당', desc: '쌀국수 1만 5천동, 현지인 아침 식사 문화' },
      { name: '나이트마켓 먹자골목', desc: '구운 해산물·스프링롤·쌀국수, 저녁 6시 이후 오픈' },
      { name: 'Lac Canh 그릴 식당', desc: '나트랑 로컬 식당, 직접 구워 먹는 해산물 그릴' },
    ],
    bars: [
      { name: 'Louisianne Brewhouse', desc: '나트랑 대표 바, 야외 수영장 옆 맥주' },
      { name: '스카이라이트 루프탑 바', desc: '26층 바다 전망 루프탑' },
    ],
    activities: [
      { name: '스노클링·다이빙 투어', desc: '혼문 섬 앞 산호초, 반나절 보트 투어' },
      { name: '머드 스파 (탑바 머드배스)', desc: '온천 진흙 목욕, 나트랑 대표 체험' },
      { name: '냐짱 바다 낚시', desc: '반나절 낚시 투어, 잡은 생선 즉석 조리' },
    ],
  },
  다낭: {
    attractions: [
      { name: '바나힐·골든 브릿지', desc: '손 모양 황금 다리, 구름 위 놀이공원', tip: '날씨 맑은 날 오전 방문 추천' },
      { name: '미케 비치', desc: '세계 6대 해변, 20km 백사장·리조트 밀집' },
      { name: '호이안 고도 당일치기', desc: '다낭에서 30분, 유네스코 등재 구시가지 등불 축제' },
      { name: '오행산 (마블 마운틴)', desc: '동굴 사원, 다낭 전경 전망대' },
    ],
    restaurants: [
      { name: '미꽝 1A', desc: '다낭 현지 면요리 명가, 두꺼운 쌀국수에 새우·돼지고기' },
      { name: '반미 퐁홍', desc: '다낭 바게트 샌드위치 맛집, 새벽부터 줄 섬' },
      { name: '하이사이드 시장 해산물', desc: '신선한 현지 해산물 kg당 구매 후 즉석 조리' },
    ],
    bars: [
      { name: 'Waterfront Restaurant & Bar', desc: '한강 뷰 레스토랑 겸 바' },
      { name: '안 바 비치 클럽', desc: '미케 비치 앞 낮 수영·밤 파티' },
    ],
    activities: [
      { name: '한강 유람선', desc: '다낭 야경 크루즈, 드래곤 브릿지 불쇼 토·일 9pm' },
      { name: '서핑 레슨 (미케비치)', desc: '다낭 서핑 천국, 4-8월 파도가 좋음' },
      { name: '호이안 야시장 저녁 투어', desc: '등불 사기·소원 등불 띄우기·로컬 음식' },
    ],
  },
  미야코지마: {
    attractions: [
      { name: '요나하마에하마 해변', desc: '일본 최고의 해변으로 손꼽히는 순백의 모래사장, 에메랄드빛 얕은 바다', tip: '밀물 시간 피해 오전 방문 추천' },
      { name: '이마 비치', desc: '스노클링 명소, 바다거북 목격 빈도 높음' },
      { name: '미야코지마 시 열대식물원', desc: '무료 입장, 이국적인 열대식물 산책' },
      { name: '히라라 항구 지구', desc: '미야코지마 중심 항구, 석양 감상 포인트' },
      { name: '이케마 섬·이라부 섬 드라이브', desc: '다리로 연결된 인근 섬, 절경 드라이브 코스' },
      { name: '이라부 대교', desc: '전장 3.54km 일본 최장 무료 다리, 바다 위 드라이브' },
    ],
    restaurants: [
      { name: '미야코 소바 현지 식당', desc: '미야코지마 향토 소바, 오키나와 소바와는 다른 굵은 면발', tip: '히라라 시내 골목 식당이 현지인 단골' },
      { name: '고야 참푸루 식당', desc: '오키나와 대표 볶음요리, 여주·두부·돼지고기' },
      { name: '섬 야채 정식 (시마야사이)', desc: '현지 유기농 섬 채소 정식, 아침 식사로 인기' },
      { name: '이자카야 히라라 시내', desc: '현지 주민들 퇴근 후 단골 이자카야 밀집 거리' },
      { name: '참치 해산물 덮밥', desc: '미야코지마 근해 직송 참치, 항구 근처 식당가' },
    ],
    bars: [
      { name: '히라라 시내 이자카야 골목', desc: '현지 주민 문화 그대로, 오키나와 아와모리 사케 체험' },
      { name: '비치 바 (선셋 타임)', desc: '해변가 바에서 석양 감상, 4-6월·9-11월 최고' },
      { name: '민숙 併設 바', desc: '게스트하우스 併設 소규모 바, 여행자와 현지인 교류 공간' },
    ],
    activities: [
      { name: '스노클링·다이빙', desc: '일본 최고의 투명도, 바다거북 함께 수영 가능', tip: '우미가메(바다거북) 스노클링 투어 예약 추천' },
      { name: '시 카약', desc: '맨그로브 숲 카약, 이나후쿠만 일대 투어' },
      { name: '자전거·스쿠터 렌탈', desc: '섬 일주 반나절~1일 코스, 스쿠터 1000-1500엔/일' },
      { name: '선셋 크루즈', desc: '배 위에서 감상하는 미야코지마 석양, 4-10월 운항' },
      { name: '성게 채취 체험', desc: '현지 어부와 함께하는 성게 채취·즉석 시식 체험' },
      { name: '별 관찰 투어', desc: '광공해 없는 섬에서 은하수 관측, 여름밤 추천' },
    ],
  },
  제주: {
    attractions: [
      { name: '한라산 등반', desc: '성판악 or 관음사 코스, 일출 감상 추천', tip: '오전 12시 이후 탐방로 입장 금지' },
      { name: '성산일출봉', desc: '유네스코 세계자연유산, 일출 명소' },
      { name: '만장굴', desc: '세계 최장 용암 동굴 중 하나, 시원함' },
      { name: '협재·금능 해수욕장', desc: '에메랄드빛 얕은 바다, 제주 서부 최고 해변' },
      { name: '우도', desc: '당일치기 섬 여행, 자전거로 돌아보기' },
    ],
    restaurants: [
      { name: '동문 재래시장', desc: '제주 오메기떡·고등어회·흑돼지, 로컬 시장 분위기' },
      { name: '흑돼지 거리 (제주시)', desc: '제주 흑돼지 삼겹살 전문 식당 밀집' },
      { name: '제주 해녀의집', desc: '해녀 할머니 직접 잡은 해산물 정식' },
      { name: '공천포 게우젓 식당', desc: '갈치조림·고등어 구이, 현지인 반찬 문화' },
    ],
    bars: [
      { name: '제주 구도심 바 거리 (칠성로)', desc: '제주 현지 청년들 술자리 문화' },
      { name: '함덕 해변 바', desc: '야외 테라스 바, 해변 보며 맥주' },
    ],
    activities: [
      { name: '해녀 체험', desc: '우도·세화 해녀 학교, 체험 프로그램 운영' },
      { name: '한라산 승마 체험', desc: '중산간 목장 승마, 제주 경관 감상' },
      { name: '스쿠버 다이빙', desc: '서귀포 문섬, 국내 최고 다이빙 포인트' },
      { name: '카약·SUP (협재해수욕장)', desc: '에메랄드 바다 위 패들보드' },
    ],
  },
}

const FALLBACK: GuideData = {
  attractions: [
    { name: '구시가지·역사지구', desc: '해당 도시의 역사와 문화를 느낄 수 있는 구도심 지역' },
    { name: '현지 시장', desc: '신선한 식재료와 로컬 분위기, 현지인의 일상 관찰' },
    { name: '주요 박물관·미술관', desc: '도시의 역사와 예술을 한눈에 볼 수 있는 문화시설' },
  ],
  restaurants: [
    { name: '현지 재래시장 내 식당', desc: '가장 저렴하고 신선한 현지 음식을 맛볼 수 있는 곳' },
    { name: '주거 지역 골목 식당', desc: '관광지를 벗어난 현지인 단골 식당가' },
  ],
  bars: [
    { name: '현지 청년 바 거리', desc: '현지인들이 즐겨 찾는 바와 펍이 모인 거리' },
  ],
  activities: [
    { name: '도보·자전거 시내 투어', desc: '걸어서 골목 구석구석 탐방, 렌탈 자전거 활용' },
    { name: '현지 쿠킹 클래스', desc: '현지 요리 배우기, 시장 투어 포함인 경우 많음' },
  ],
}

type SectionKey = 'attractions' | 'restaurants' | 'bars' | 'activities'

const SECTIONS: { key: SectionKey; label: string; emoji: string }[] = [
  { key: 'attractions', label: '주요 관광지', emoji: '🗺️' },
  { key: 'restaurants', label: '현지 맛집', emoji: '🍽️' },
  { key: 'bars', label: '현지 술집', emoji: '🍺' },
  { key: 'activities', label: '추천 액티비티', emoji: '🎯' },
]

interface Props {
  destination: string
}

function findGuideData(destination: string): GuideData {
  const exact = GUIDE[destination]
  if (exact) return exact
  const key = Object.keys(GUIDE).find(k => destination.includes(k) || k.includes(destination))
  return key ? GUIDE[key] : FALLBACK
}

export default function GuideTab({ destination }: Props) {
  const [activeSection, setActiveSection] = useState<SectionKey>('attractions')
  const [showAI, setShowAI] = useState(false)
  const [aiResult, setAiResult] = useState<PlaceItem[] | null>(null)
  const [aiAdded, setAiAdded] = useState<PlaceItem[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const data = findGuideData(destination)
  const section = SECTIONS.find(s => s.key === activeSection)!
  const items = [...data[activeSection], ...aiAdded]

  async function generateAI() {
    setAiLoading(true); setAiError(''); setAiResult(null)
    const sectionLabel = section.label
    const prompt = `${destination}의 ${sectionLabel} 중 현지인에게 유명하지만 잘 알려지지 않은 숨은 명소 3곳을 아래 JSON 형식으로만 답해 (설명 없이):
[{"name":"장소명","desc":"한줄 설명","tip":"현지 팁 (없으면 빈 문자열)"}]`
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      })
      const data = await res.json()
      const text: string = data.choices?.[0]?.message?.content ?? ''
      const match = text.match(/\[[\s\S]*\]/)
      if (match) setAiResult(JSON.parse(match[0]) as PlaceItem[])
    } catch { setAiError('추천 생성에 실패했습니다. 다시 시도해주세요.') }
    setAiLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* 상단 버튼 행 */}
      <div className="flex gap-2">
        <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => { setActiveSection(s.key); setAiResult(null); setAiAdded([]) }}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition ${
                activeSection === s.key
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowAI(v => !v); if (showAI) { setAiResult(null) } }}
          className={`flex-shrink-0 ${btn.ai(showAI)}`}
        >
          ✨ AI
        </button>
      </div>

      {showAI && (
        <AIResultPanel
          title="AI 숨은 명소 추천"
          subtitle={`${destination} · ${section.emoji} ${section.label}`}
          generateLabel="숨은 명소 추천 받기"
          onGenerate={generateAI}
          loading={aiLoading}
          result={aiResult && (
            <div className="space-y-2">
              {aiResult.map((item, i) => (
                <div key={i} className="py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  {item.tip && <p className="text-xs text-indigo-500 mt-1">💡 {item.tip}</p>}
                </div>
              ))}
            </div>
          )}
          error={aiError}
          onRetry={() => { setAiResult(null) }}
          onAdd={() => { setAiAdded(prev => [...prev, ...(aiResult ?? [])]); setAiResult(null); setShowAI(false) }}
          addLabel="목록에 추가"
        />
      )}

      {/* 장소 목록 */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 px-1">📍 {destination} · {section.emoji} {section.label}</p>
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-xl px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            {item.tip && (
              <p className="text-xs text-indigo-500 mt-1">💡 {item.tip}</p>
            )}
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(item.name + ' ' + destination)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 mt-1 flex items-center gap-1 hover:text-indigo-400 transition-colors"
            >
              📍 지도 보기
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
