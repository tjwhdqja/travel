import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AIResultPanel from '../components/AIResultPanel'
import EmptyState from '../components/EmptyState'
import { btn } from '../lib/design'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string


interface ShopItem {
  id: string
  text: string
  checked: boolean
}

interface RecommendGroup {
  label: string
  items: string[]
}

const SHOPPING_DATA: Record<string, RecommendGroup[]> = {
  '오사카': [
    { label: '🍬 간식·식품', items: ['로이스 생초콜릿', '글리코 과자 세트', '킷캣 말차', '우마이봉', '551호라이 돼지만두', '도지마롤', '타코야키 믹스'] },
    { label: '🎁 기념품', items: ['글리코 달리기 피규어', '도톤보리 굿즈', '오사카 에코백'] },
  ],
  '도쿄': [
    { label: '🍬 간식·식품', items: ['도쿄 바나나', '밀크티 카라멜', '고베야 비스킷', '로이스 초콜릿'] },
    { label: '🛍 패션·뷰티', items: ['이세탄 화장품', '돈키호테 스킨케어', '시세이도'] },
    { label: '🎁 기념품', items: ['닌텐도 굿즈', '지브리 굿즈', '스카이트리 기념품'] },
  ],
  '교토': [
    { label: '🍬 간식·식품', items: ['말차 과자', '교토 생팔찌 젤리', '니시키 절임', '유바 과자'] },
    { label: '🛍 패션·뷰티', items: ['요지야 기름종이', '교토 코스메', '기모노 소품'] },
    { label: '🎁 기념품', items: ['교토 부채', '마이코 굿즈', '기요미즈데라 부적'] },
  ],
  '후쿠오카': [
    { label: '🍬 간식·식품', items: ['멘타이코 (명란)', '하카타 라멘 세트', '히요코 만주', '모츠나베 소스'] },
    { label: '🎁 기념품', items: ['하카타 인형', '후쿠오카 굿즈'] },
  ],
  '삿포로': [
    { label: '🍬 간식·식품', items: ['로이스 생초콜릿', '시로이코이비토 쿠키', '삿포로 수프 카레 세트', '홋카이도 버터 쿠키'] },
    { label: '🎁 기념품', items: ['홋카이도 유제품', '삿포로 맥주'] },
  ],
  '오키나와': [
    { label: '🍬 간식·식품', items: ['홍이모 과자', '시콰사 주스', '오리온 맥주', '야마토 흑설탕'] },
    { label: '🛍 패션·뷰티', items: ['류큐 유리공예', '오키나와 도자기'] },
    { label: '🎁 기념품', items: ['시사 피규어', '오키나와 에코백'] },
  ],
  '나고야': [
    { label: '🍬 간식·식품', items: ['우이로 (떡과자)', '에비센', '미소카츠 소스', '나고야 코친 라멘'] },
  ],
  '나라': [
    { label: '🍬 간식·식품', items: ['나라 와가시 (화과자)', '카키노하즈시'] },
    { label: '🎁 기념품', items: ['사슴 굿즈', '나라 전통 공예품'] },
  ],
  '미야코지마': [
    { label: '🍬 간식·식품', items: ['미야코섬 소금', '흑당 과자 (치인스코)', '사탕수수 설탕', '미야코 소바 세트', '아와모리 미니어처', '모즈쿠 (해초) 가공품', '도라야키 (흑당 맛)'] },
    { label: '🛍 패션·뷰티', items: ['미야코 블루 티셔츠', '아마미 오시마 직물 소품', '류큐 유리 제품', '오키나와 선크림'] },
    { label: '🎁 기념품', items: ['산호 액세서리', '시사 (시쉐) 도자기 인형', '미야코지마 지도 엽서', '해양 레진 공예품', '조개껍데기 인테리어 소품'] },
  ],
  '방콕': [
    { label: '🍬 간식·식품', items: ['망고 말린것', '코코넛 사탕', '마사만 카레 페이스트', '팟타이 소스'] },
    { label: '🛍 패션·뷰티', items: ['짐톰슨 실크', '하버드 코코넛 오일', '타이 허브 스파 용품'] },
    { label: '🎁 기념품', items: ['타이 상아 모형', '왓포 기념품', '전통 목각 인형'] },
  ],
  '발리': [
    { label: '🍬 간식·식품', items: ['코피루왁 원두', '발리 커피', '코코넛 오일'] },
    { label: '🛍 패션·뷰티', items: ['바틱 패브릭', '발리 은세공 액세서리', '천연 스파 용품'] },
    { label: '🎁 기념품', items: ['가네샤 목조 조각', '발리 그림', '라탄 가방'] },
  ],
  '다낭': [
    { label: '🍬 간식·식품', items: ['베트남 드립백 커피', '코코넛 사탕', '호이안 과자'] },
    { label: '🛍 패션·뷰티', items: ['아오자이', '논라 (삿갓)', '실크 제품'] },
    { label: '🎁 기념품', items: ['호이안 등불', '베트남 옻칠 공예'] },
  ],
  '세부': [
    { label: '🍬 간식·식품', items: ['망고 말린것', '오타프 쿠키', '바나나 칩', '카야 잼'] },
    { label: '🎁 기념품', items: ['진주 액세서리', '필리핀 자개 공예'] },
  ],
  '싱가포르': [
    { label: '🍬 간식·식품', items: ['TWG 차', '야쿤 카야 잼', '반딧불 파인애플 케이크'] },
    { label: '🛍 패션·뷰티', items: ['찰스&키스', '페드로 신발'] },
    { label: '🎁 기념품', items: ['머라이언 굿즈', '가든스바이더베이 기념품'] },
  ],
  '푸켓': [
    { label: '🍬 간식·식품', items: ['망고스틴 잼', '코코넛 쿠키'] },
    { label: '🛍 패션·뷰티', items: ['타이실크', '천연 스파·마사지 용품'] },
  ],
  '하노이': [
    { label: '🍬 간식·식품', items: ['베트남 드립백 커피', '피쉬소스', '포 육수팩'] },
    { label: '🛍 패션·뷰티', items: ['논라 (삿갓)', '레몬그라스 스파 용품'] },
    { label: '🎁 기념품', items: ['도자기', '칠기 제품'] },
  ],
  '호치민': [
    { label: '🍬 간식·식품', items: ['쌀국수 육수팩', '베트남 커피', '코코넛 잼'] },
    { label: '🛍 패션·뷰티', items: ['아오자이', '레몬그라스 스파 용품'] },
  ],
  '쿠알라룸푸르': [
    { label: '🍬 간식·식품', items: ['버터 쿠키', '두리안 과자', '화이트 커피'] },
    { label: '🎁 기념품', items: ['페트로나스 굿즈', '바틱 소품'] },
  ],
  '치앙마이': [
    { label: '🛍 패션·뷰티', items: ['핸드메이드 비누', '실버 쥬얼리', '캔들·디퓨저', '타이 허브 제품'] },
    { label: '🎁 기념품', items: ['우산 공예품', '손수 직조 패브릭', '목각 코끼리'] },
  ],
  '홍콩': [
    { label: '🍬 간식·식품', items: ['파인애플빵 믹스', '왕 향기름', '닥터콩 계란와플', '진주밀크티'] },
    { label: '🛍 패션·뷰티', items: ['SK-II', '비오템', '홍콩 드럭스토어 화장품'] },
  ],
  '마카오': [
    { label: '🍬 간식·식품', items: ['에그타르트', '아몬드 쿠키', '육포 (베이컨)', '세라두라'] },
    { label: '🎁 기념품', items: ['마카오 카지노 칩 기념품', '포르투갈 타일 소품'] },
  ],
  '타이베이': [
    { label: '🍬 간식·식품', items: ['펑리수 (파인애플케이크)', '카바란 위스키', '진주밀크티 파우더', '빈랑 과자'] },
    { label: '🛍 패션·뷰티', items: ['미스터케이 스킨케어', '마이뷰티다이어리 마스크팩'] },
    { label: '🎁 기념품', items: ['고궁박물원 굿즈', '대만 원주민 공예품'] },
  ],
  '파리': [
    { label: '🍬 간식·식품', items: ['피에르에르메 마카롱', '라뒤레 마카롱', '고디바 초콜릿', '포숑 잼'] },
    { label: '🛍 패션·뷰티', items: ['루이비통', '샤넬', '에르메스', '향수 (겔랑·디올)', '약국 화장품 (라로슈포제)'] },
    { label: '🎁 기념품', items: ['에펠탑 굿즈', '루브르 박물관 굿즈'] },
  ],
  '런던': [
    { label: '🍬 간식·식품', items: ['해로즈 비스킷', '포트넘앤메이슨 홍차', '마마이트', '쇼트브레드'] },
    { label: '🛍 패션·뷰티', items: ['닥터마틴', '버버리', '막스앤스펜서'] },
    { label: '🎁 기념품', items: ['근위병 굿즈', '빅벤 기념품', '해리포터 굿즈'] },
  ],
  '로마': [
    { label: '🍬 간식·식품', items: ['파스타', '트뤼플 소금·오일', '올리브오일', '발사믹 식초'] },
    { label: '🛍 패션·뷰티', items: ['가죽 지갑·벨트', '이탈리아 향수'] },
    { label: '🎁 기념품', items: ['콜로세움 굿즈', '바티칸 기념품', '베네치아 유리공예'] },
  ],
  '바르셀로나': [
    { label: '🍬 간식·식품', items: ['이베리코 하몽', '올리브오일', '카바 스파클링 와인', '초리소'] },
    { label: '🎁 기념품', items: ['가우디 굿즈', 'FC바르셀로나 굿즈', '플라멩코 소품'] },
  ],
  '프라하': [
    { label: '🍬 간식·식품', items: ['체코 맥주', '꿀 와인 (메도비나)', '트르들로 믹스'] },
    { label: '🎁 기념품', items: ['보헤미안 크리스탈', '마리오네트 인형', '체코 도자기'] },
  ],
  '암스테르담': [
    { label: '🍬 간식·식품', items: ['고다 치즈', '스트로프와펠', '드롭 (감초사탕)', '하이네켄'] },
    { label: '🎁 기념품', items: ['델프트 도자기', '튤립 구근', '나막신 미니어처'] },
  ],
  '두바이': [
    { label: '🍬 간식·식품', items: ['메디쥴 대추야자', '사프란', '피스타치오'] },
    { label: '🛍 패션·뷰티', items: ['오우드 향수', '아르간 오일', '골드수크 금'] },
    { label: '🎁 기념품', items: ['아랍 전통 커피잔 세트', '낙타 인형'] },
  ],
  '이스탄불': [
    { label: '🍬 간식·식품', items: ['터키시 딜라이트', '터키 차이·커피', '석류 소스', '터키 꿀'] },
    { label: '🛍 패션·뷰티', items: ['터키 수건 (페슈테말)', '터키 비누'] },
    { label: '🎁 기념품', items: ['이즈닉 도자기', '나자르 봉주르 (눈부적)', '터키 카펫'] },
  ],
  '하와이': [
    { label: '🍬 간식·식품', items: ['마카다미아 너트', '코나 커피', '빌라빌로나 초콜릿', '하와이안 호스트 초코'] },
    { label: '🛍 패션·뷰티', items: ['알로하 셔츠', '레이 화환', '선스크린'] },
    { label: '🎁 기념품', items: ['하와이 훌라 인형', '우쿨렐레 소품'] },
  ],
  '괌': [
    { label: '🍬 간식·식품', items: ['타노 초콜릿', '마카다미아 너트', '괌 커피'] },
    { label: '🎁 기념품', items: ['차모로 전통 공예품', '괌 에코백'] },
  ],
  '뉴욕': [
    { label: '🍬 간식·식품', items: ['트레이더조 간식', '그래놀라바', '땅콩버터'] },
    { label: '🛍 패션·뷰티', items: ['자라', '갭', '코치', '랄프로렌', 'MAC 화장품'] },
    { label: '🎁 기념품', items: ['자유의여신상 굿즈', 'MLB 굿즈', 'NBA 굿즈'] },
  ],
  'LA': [
    { label: '🍬 간식·식품', items: ['트레이더조 간식', '코스트코 견과류'] },
    { label: '🛍 패션·뷰티', items: ['어반 아웃피터스', '프리피플', '스케이트 브랜드'] },
    { label: '🎁 기념품', items: ['할리우드 기념품', 'MLB 굿즈'] },
  ],
  '시드니': [
    { label: '🍬 간식·식품', items: ['팀탐 비스킷', '마카다미아', '베지마이트', '호주 와인'] },
    { label: '🛍 패션·뷰티', items: ['울 제품 (메리노울)', '어그 부츠'] },
    { label: '🎁 기념품', items: ['오팔 보석', '캥거루 인형', '코알라 굿즈'] },
  ],
  '뉴질랜드': [
    { label: '🍬 간식·식품', items: ['마누카 꿀', '그린립 홍합 파우더', '키위 초콜릿'] },
    { label: '🛍 패션·뷰티', items: ['포섬 메리노울 제품', '양털 슬리퍼'] },
    { label: '🎁 기념품', items: ['마오리 목각 조각', '호빗 굿즈'] },
  ],
  '제주도': [
    { label: '🍬 간식·식품', items: ['한라봉 초콜릿', '감귤 마카롱', '제주 흑돼지 육포', '오메기떡', '녹차 제품', '제주 감귤 주스'] },
    { label: '🛍 패션·뷰티', items: ['제주 천연 화장품', '녹차 스킨케어'] },
  ],
  '부산': [
    { label: '🍬 간식·식품', items: ['씨앗호떡 믹스', '부산 어묵 세트', '납자루 떡볶이 소스', '돼지국밥 소스'] },
    { label: '🎁 기념품', items: ['부산 굿즈', '자갈치 시장 건어물'] },
  ],
  '경주': [
    { label: '🍬 간식·식품', items: ['황남빵', '찰보리빵', '경주 한과', '교동 법주'] },
    { label: '🎁 기념품', items: ['신라 기념품', '첨성대 굿즈', '전통 도자기'] },
  ],
  '전주': [
    { label: '🍬 간식·식품', items: ['전주 초코파이', '콩나물 국밥 소스', '전주 비빔밥 소스', '전통 한과'] },
    { label: '🎁 기념품', items: ['한지 제품', '부채', '전통 공예품'] },
  ],
  '여수': [
    { label: '🍬 간식·식품', items: ['돌산 갓김치', '여수 돌게장', '여수 갈치조림 소스'] },
  ],
  '강릉': [
    { label: '🍬 간식·식품', items: ['강릉 커피 원두', '초당 두부', '순두부 믹스', '강릉 참기름'] },
  ],
  '사이판': [
    { label: '🍬 간식·식품', items: ['코코넛 크림파이', '마리아나 커피', '타피오카 과자'] },
    { label: '🎁 기념품', items: ['차모로 전통 공예품'] },
  ],
  '상하이': [
    { label: '🍬 간식·식품', items: ['상하이 월병', '우롱차', '소흥주'] },
    { label: '🛍 패션·뷰티', items: ['상하이탕 기념품', '마스크팩'] },
  ],
  '베이징': [
    { label: '🍬 간식·식품', items: ['북경오리 소스', '차 세트 (우롱·보이차)', '궁중 과자'] },
    { label: '🎁 기념품', items: ['만리장성 굿즈', '경극 마스크', '경태람 공예'] },
  ],
}

interface Props {
  tripId: string
  userName: string
  destination: string
}

export default function ShoppingTab({ tripId, userName, destination }: Props) {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAI, setShowAI] = useState(false)
  const [aiResult, setAiResult] = useState<RecommendGroup[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showRecommend, setShowRecommend] = useState(true)

  const presetData = SHOPPING_DATA[destination] ?? null

  useEffect(() => { fetchItems() }, [tripId])

  async function fetchItems() {
    const { data } = await supabase.from('checklists')
      .select('*').eq('trip_id', tripId).eq('type', 'shopping').order('created_at')
    setItems(data ?? [])
    setLoading(false)
  }

  async function addItem(text: string) {
    if (!text.trim()) return
    const existing = items.find(i => i.text === text.trim())
    if (existing) return
    const { data } = await supabase.from('checklists')
      .insert([{ trip_id: tripId, text: text.trim(), checked: false, created_by: userName, type: 'shopping' }])
      .select().single()
    if (data) setItems(prev => [...prev, data])
  }

  async function toggleItem(item: ShopItem) {
    const { data } = await supabase.from('checklists')
      .update({ checked: !item.checked }).eq('id', item.id).select().single()
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('checklists').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function generateAI() {
    setAiLoading(true); setAiError(''); setAiResult(null)
    const prompt = `${destination} 여행 시 사오기 좋은 특산품, 기념품, 현지 간식 추천을 아래 JSON 형식으로만 답해 (설명 없이):
[{"label":"🍬 간식·식품","items":["아이템1","아이템2"]},{"label":"🛍 패션·뷰티","items":[]},{"label":"🎁 기념품","items":["아이템1"]}]
각 카테고리 5개 이내, 없는 카테고리는 제외`
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
      if (match) setAiResult(JSON.parse(match[0]) as RecommendGroup[])
    } catch { setAiError('추천 생성에 실패했습니다. 다시 시도해주세요.') }
    setAiLoading(false)
  }

  async function addAllAiItems() {
    if (!aiResult) return
    const allItems = aiResult.flatMap(g => g.items)
    for (const text of allItems) await addItem(text)
    setAiResult(null)
  }

  const addedTexts = new Set(items.map(i => i.text))
  const checkedItems = items.filter(i => i.checked)
  const uncheckedItems = items.filter(i => !i.checked)

  return (
    <div className="space-y-4">
      {/* 상단 버튼 행 */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowRecommend(v => !v)}
          className={`flex-1 ${btn.toggle(showRecommend)}`}
        >
          🛒 쇼핑 추천
        </button>
        <button
          onClick={() => { setShowAI(v => !v); if (showAI) { setAiResult(null) } }}
          className={btn.ai(showAI)}
        >
          ✨ AI
        </button>
      </div>

      {showAI && (
        <AIResultPanel
          title="AI 쇼핑 추천"
          subtitle={`${destination} · 현지 특산품·기념품 추천`}
          generateLabel="AI 추천 받기"
          onGenerate={generateAI}
          loading={aiLoading}
          result={aiResult && (
            <div className="space-y-3">
              {aiResult.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-gray-400 mb-2">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map(p => (
                      <span key={p} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          error={aiError}
          onRetry={() => { setAiResult(null) }}
          onAdd={addAllAiItems}
          addLabel="전체 쇼핑 리스트에 추가"
        />
      )}

      {/* 추천 섹션 */}
      {showRecommend && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          {presetData ? (
            presetData.map(group => {
              const available = group.items.filter(p => !addedTexts.has(p))
              if (available.length === 0) return null
              return (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-gray-400 mb-2">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {available.map(p => (
                      <button key={p} onClick={() => addItem(p)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs rounded-full hover:bg-indigo-100 transition">
                        + {p}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-xs text-gray-400 text-center">"{destination}"의 추천 정보가 없어요</p>
          )}
        </div>
      )}

      {/* 내 쇼핑 리스트 */}
      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : items.length === 0 ? (
        <EmptyState icon="🛍" title="아직 쇼핑 리스트가 비어있어요" subtitle="위에서 담고 싶은 것을 추가해보세요" />
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-gray-700">내 쇼핑 리스트</p>
            <span className="text-xs text-gray-400">{checkedItems.length}/{items.length} 완료</span>
          </div>
          <div className="space-y-2">
            {uncheckedItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                <button onClick={() => toggleItem(item)}
                  className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-indigo-400 flex-shrink-0 transition" />
                <span className="flex-1 text-sm text-gray-800">{item.text}</span>
                <button onClick={() => deleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-400 transition text-xs">삭제</button>
              </div>
            ))}
          </div>
          {checkedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 px-1">구매 완료 {checkedItems.length}개</p>
              {checkedItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 opacity-50">
                  <button onClick={() => toggleItem(item)}
                    className="w-5 h-5 rounded-full bg-indigo-400 flex-shrink-0 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </button>
                  <span className="flex-1 text-sm text-gray-400 line-through">{item.text}</span>
                  <button onClick={() => deleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-400 transition text-xs">삭제</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
