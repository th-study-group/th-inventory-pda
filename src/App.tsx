// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { UserRound } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';

// ==========================================
// 1. 공통 상수 및 폰트 아이콘 대체 (SVG)
// ==========================================
const COLORS = {
  primary: '#F2721C',       // 주황색 포인트 및 주요 버튼
  primaryHover: '#D95E0F',
  darkBg: '#1C263B',        // 헤더 및 모달 타이틀바 어두운색
  lightBg: '#F3F6F9',       // 본문 폼 영역 및 회색 카드 배경
  border: '#E2E8F0',
  textMain: '#1A202C',
  textMuted: '#718096',
  white: '#FFFFFF',
  errorBg: '#181A20',       // 경고창 배경색 (다크)
  success: '#10B981',
};

// ==========================================
// 2. Mock Data (공통 저장소 대용)
// ==========================================
const INITIAL_WAREHOUSES = {
  '본사': ['A01', 'B02', 'C03', 'A02'],
  '1공장': ['A002', 'B03', 'C03', 'A02'],
  '2공장': ['B01', 'B02', 'B03', 'C03', 'A01']
};

// 역방향 검색용: 특정 위치코드가 속해 있는 창고 목록 반환 함수
const findWarehousesByCode = (code) => {
  if (!code) return [];
  const matched = [];
  Object.entries(INITIAL_WAREHOUSES).forEach(([whName, codes]) => {
    if (codes.includes(code)) {
      matched.push(whName);
    }
  });
  return matched;
};

// 1. 부품입고 Mock
const ARRIVAL_MOCK = [
  { id: 'IN-20260527-001', code: '원재료_필리아-MAIN_PCB-520', name: '필리아 ES-55200 MAIN PCB 스펙 패키지', qty: 150 },
  { id: 'IN-20260527-002', code: '원재료_필리아-MODULE-017', name: '필리아 PFM-380CE 지문모듈(원형)_FRONT_TITAN', qty: 100 },
  { id: 'IN-20260527-003', code: '원재료_필리아-MAIN_PCB-520', name: '필리아 ES-85205 MAIN SH', qty: 80 }
];

// 2. 생산품입고 Mock
const FINISHED_GOODS_MOCK = [
  { code: 'PRO-520-FR-022233-99', name: '필리아 ES-520B MAIN_일본어 전용 스펙 패키지', qty: 5 },
  { code: 'PRO-520-ACC-01', name: 'SCREW PACKING (S520)', qty: 500 },
  { code: 'PRO-520-MAIN-02', name: 'MAIN BODY ASSEMBLY (S520)', qty: 300 },
  { code: 'PRO-520-FRONT-01', name: 'FRONT FRAME 준비 (S520)', qty: 34 }
];

// 3. 생산투입 Mock
const WORK_ORDERS_MOCK = {
  'W00370': {
    woNumber: 'W00370',
    productCode: 'PRO-520-FR01',
    productName: '필리아 ES-5520B MAIN_일본어 전용 스펙 패키지',
    subParts: [
      {
        code: '원재료_필리아-MAIN_PC-520-011111111111111111111111111111111111111',
        name: '필리아 ES-S520B MAIN_일본어 전용 스펙 패키지',
        location: '본사쇼핑몰',
        required: 10,
        current: 2,
        stock: 500
      },
      {
        code: '원재료_필리아-SUB_INTEG-110-01',
        name: '필리아 브래킷 배선 컴포넌트_20260604생산작업본_20260604생산작업본_20260604생산작업본',
        location: '본사쇼핑몰_20260604생산작업본_20260604생산작업본_20260604생산작업본_20260604생산작업본',
        required: 10,
        current: 2,
        stock: 500
      }
    ]
  },
  'W00356': {
    woNumber: 'W00356',
    productCode: 'ENASPI-SUB-520-02',
    productName: 'Sleeky 35H',
    subParts: [
      {
        code: '원재료_삼진금속-0035',
        name: 'SCREW_영번2종(블랙)',
        location: '본사쇼핑몰',
        required: 10,
        current: 0,
        stock: 1050
      },
      {
        code: '원재료_삼진금속-0012',
        name: 'SCREW_피형2종(니켈)',
        location: '본사쇼핑몰',
        required: 10,
        current: 0,
        stock: 400
      }
    ]
  }
};

// 4. 출고 Mock
const SHIPMENT_PARTS_MOCK = [
  { code: '원재료_이랜시스-02-20', name: '이랜시스 일반모티스', spec: 'MINI-UNI', qty: 13 },
  { code: '원재료_솔리티-KEY_PCB-8000-01', name: 'EPIC Front PCB_EF-8000 AREA', spec: 'F-6100', qty: 5 }
];

// 5. 재고이동/재고실사 Mock
const LOCATION_STOCK_PARTS_MOCK = [
  { code: 'RM-ENS-02-VERY-LONG-PART-NAME-2026-A-B-C', name: '이랜시스 통합 제어 모듈_베이스온_테스트_2', spec: 'A-200', qty: 4 },
  { code: 'RM-ENS-02-VERY-LO...', name: '이랜시스 통합 제어 모듈_테스트_1', spec: 'B-100', qty: 150 },
  { code: 'RM-SH-M1-SAMPLE', name: '샘플 알루미늄 판넬 커버 스펙', spec: 'SAMPLE', qty: 250 }
]

// ==========================================
// SVG 아이콘 컴포넌트 목록
// ==========================================
const SvgBarcode = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 5h2v14H3zm4 0h1v14H7zm3 0h3v14h-3zm5 0h1v14h-1zm3 0h3v14h-3z" />
  </svg>
);

const SvgMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1v11a4 4 0 0 0 4-4V5a4 4 0 0 0-8 0v3a4 4 0 0 0 4 4z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

const SvgChevronDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const SvgChevronUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

export default function App() {

  // 시스템 전체 상태 관리
  const [currentPage, setCurrentPage] = useState('LOGIN'); // LOGIN, MAIN, PARTS_IN, finished_IN, PROD_INPUT, OUT, TRANS, INSPECT

  const partsInputRef = React.useRef(null);
  const [partsScanInputMode, setPartsScanInputMode] = useState<'none' | 'text'>('none');

  const [user, setUser] = useState(null); // { id: 'tester', name: '홍길동', dept: '생산팀' }
  const [loginId, setLoginId] = useState('tester');
  const [loginPw, setLoginPw] = useState('1234');
  const [showUserModal, setShowUserModal] = useState(false);

  // 공통 전역 피드백 모달 상태
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // 오류 문구 있을 시 팝업 노출
  const [confirmMsg, setConfirmMsg] = useState(null); // { text, onConfirm } 형태
  const [successMsg, setSuccessMsg] = useState(null); // 단순 안내용 팝업

  // 공통 음성 입력 가상 타이머 상태
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState(null); // 'transReason', 'inspectReason' 등
  const voiceRecognitionRef = useRef<any>(null);
  const voiceManualStopRef = useRef(false);

  // ==========================================
  // 각 기능별 복합 데이터 상태
  // ==========================================
  
  // [1. 부품입고 상태]
  const [partsInputScan, setPartsInputScan] = useState('');
  const [selectedArrival, setSelectedArrival] = useState(null); // ARRIVAL_MOCK item
  const [partsInputQty, setPartsInputQty] = useState(150);
  const [partsListOpen, setPartsListOpen] = useState(false); // 아코디언 확장 여부
  const [partsModalOpen, setPartsModalOpen] = useState(false); // 전체 선택 모달
  const partsQtyRef = React.useRef<HTMLInputElement | null>(null);

  const [partsModalTitle, setPartsModalTitle] = useState('입하목록 선택');
  const [partsModalItems, setPartsModalItems] = useState([]);

  const partsLocationRef = React.useRef(null);
  const [partsLocation, setPartsLocation] = useState('');
  const [partsWarehouse, setPartsWarehouse] = useState('');
  const [partsLocationInputMode, setPartsLocationInputMode] = useState<'none' | 'text'>('none');
  const [partsLocationReadOnly, setPartsLocationReadOnly] = useState(false);
  const [partsErrorTarget, setPartsErrorTarget] = useState('scan');

  // [2. 생산품입고 상태]
  const goodsInputRef = React.useRef(null);
  const goodsLocationRef = React.useRef(null);
  const [goodsScan, setGoodsScan] = useState('');
  const [goodsScanInputMode, setGoodsScanInputMode] = useState<'none' | 'text'>('none');
  const [goodsLocationInputMode, setGoodsLocationInputMode] = useState<'none' | 'text'>('none');
  const [goodsLocationReadOnly, setGoodsLocationReadOnly] = useState(false);
  const [goodsScanReadOnly, setGoodsScanReadOnly] = useState(true);
  const [selectedGoods, setSelectedGoods] = useState(null);
  const [goodsLocation, setGoodsLocation] = useState('');
  const [goodsErrorTarget, setGoodsErrorTarget] = useState('');
  const [goodsQty, setGoodsQty] = useState(50);
  const [goodsAccordionOpen, setGoodsAccordionOpen] = useState(false);

  // [3. 생산투입 상태]
  const [pendingSubPart, setPendingSubPart] = useState<any>(null);
  const prodWoInputRef = React.useRef(null);
  const prodLocationRef = React.useRef(null);
  const prodQtyRef = React.useRef<HTMLInputElement | null>(null);

  const [prodModalOpenCode, setProdModalOpenCode] = useState<string | null>(null);
  const [prodModalOpenPartCode, setProdModalOpenPartCode] = useState<string | null>(null);
  const [prodModalOpenPartName, setProdModalOpenPartName] = useState<string | null>(null);
  const [prodModalOpenLocation, setProdModalOpenLocation] = useState<string | null>(null);
  const [prodModalVisibleCount, setProdModalVisibleCount] = useState(3);
  const [prodOverflowMap, setProdOverflowMap] = useState<Record<string, boolean>>({}); 

  const [prodMainOpenCode, setProdMainOpenCode] = useState(false);
  const [prodMainOpenName, setProdMainOpenName] = useState(false);
  const [prodMainOverflowMap, setProdMainOverflowMap] = useState<Record<string, boolean>>({});

  const [prodWoScan, setProdWoScan] = useState('');
  const [prodWoInputMode, setProdWoInputMode] = useState<'none' | 'text'>('none');

  const [selectedWo, setSelectedWo] = useState(null); // WORK_ORDERS_MOCK item
  const [selectedSubPart, setSelectedSubPart] = useState(null); // 선택된 하위 부품

  const [prodLocation, setProdLocation] = useState('');
  const [prodWarehouse, setProdWarehouse] = useState('');
  const [prodLocationInputMode, setProdLocationInputMode] = useState<'none' | 'text'>('none');
  const [prodLocationReadOnly, setProdLocationReadOnly] = useState(false);

  const [prodErrorTarget, setProdErrorTarget] = useState('wo');
  const [prodQty, setProdQty] = useState(0);
  const [prodAccordionOpen, setProdAccordionOpen] = useState(false);
  const [prodSubModalOpen, setProdSubModalOpen] = useState(false);

  // [4. 출고 상태]
  const outLocRef = React.useRef<HTMLInputElement | null>(null);
  const outQtyRef = React.useRef<HTMLInputElement | null>(null);

  const [outLocScan, setOutLocScan] = useState('');
  const [outWarehouse, setOutWarehouse] = useState('');

  const [selectedOutItem, setSelectedOutItem] = useState<any>(null);
  const [pendingOutItem, setPendingOutItem] = useState<any>(null);

  const [outQty, setOutQty] = useState(0);
  const [outLocInputMode, setOutLocInputMode] = useState<'none' | 'text'>('none');

  const [outAccordionOpen, setOutAccordionOpen] = useState(false);
  const [outListModalOpen, setOutListModalOpen] = useState(false);

  const [outModalOpenCode, setOutModalOpenCode] = useState<string | null>(null);
  const [outModalOpenName, setOutModalOpenName] = useState<string | null>(null);

  // [5. 재고이동 상태]
  const transFromLocRef = React.useRef<HTMLInputElement | null>(null);
  const transToLocRef = React.useRef<HTMLInputElement | null>(null);
  const transReasonRef = React.useRef<HTMLInputElement | null>(null);

  const [transFromLoc, setTransFromLoc] = useState('');
  const [transSelectedPart, setTransSelectedPart] = useState<any>(null);
  const [transToLoc, setTransToLoc] = useState('');
  const [transQty, setTransQty] = useState(0);
  const [transReason, setTransReason] = useState('');
  const [transAccordionOpen, setTransAccordionOpen] = useState(false);
  const [transListModalOpen, setTransListModalOpen] = useState(false);
  const [transFromLocInputMode, setTransFromLocInputMode] = useState<'none' | 'text'>('none');
  const [transToLocInputMode, setTransToLocInputMode] = useState<'none' | 'text'>('none');

  const [pendingTransPart, setPendingTransPart] = useState<any>(null);
  const [transModalOpenCode, setTransModalOpenCode] = useState<string | null>(null);
  const [transModalOpenName, setTransModalOpenName] = useState<string | null>(null);

  const transQrVideoRef = useRef<HTMLVideoElement | null>(null);
  const transQrStreamRef = useRef<MediaStream | null>(null);

  const [transQrOpen, setTransQrOpen] = useState(false);
  const [transQrTarget, setTransQrTarget] = useState<'from' | 'to' | null>(null);
  
  // 창고 중복 관련 전역 공유 상태
  const [warehouseSelector, setWarehouseSelector] = useState(null); // { options: [], onSelect, title }

  // [6. 재고실사 상태]
  const [inspectLoc, setInspectLoc] = useState('');
  const [inspectSelectedPart, setInspectSelectedPart] = useState(null);
  const [inspectQty, setInspectQty] = useState(50);
  const [inspectReason, setInspectReason] = useState('오적재 실사 정정');
  const [inspectAccordionOpen, setInspectAccordionOpen] = useState(false);
  const [inspectListModalOpen, setInspectListModalOpen] = useState(false);

  useEffect(() => {
    const styleId = 'pda-mobile-input-fix';

    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      input,
      textarea {
        font-size: 16px !important;
        -webkit-text-size-adjust: 100%;
      }

      input[type="text"],
      input[type="number"],
      textarea {
        autocorrect: off;
        autocomplete: off;
        -webkit-user-select: text;
        user-select: text;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  React.useEffect(() => {
    if (currentPage === 'PARTS_IN') {
      setPartsInputScan('');
      setSelectedArrival(null);
      setPartsInputQty(0);
      setPartsListOpen(false);
      setPartsModalOpen(false);

      setPartsLocation('');
      setPartsWarehouse('');
      setPartsLocationInputMode('none');
      setPartsLocationReadOnly(false);
      setPartsErrorTarget('scan');

      setPartsModalItems([]);
      setPartsModalTitle('입하목록 선택');

      focusPartsScanForBarcode();
    }

    if (currentPage === 'finished_IN') {
      setGoodsScan('');
      setSelectedGoods(null);
      setGoodsLocation('');
      setGoodsQty(0);
      setGoodsAccordionOpen(false);

      setGoodsScanInputMode('none');

      setTimeout(() => {
        if (goodsErrorTarget === 'location') {
          goodsLocationRef.current?.focus();
          goodsLocationRef.current?.select();
          return;
        }

        goodsInputRef.current?.focus();
        goodsInputRef.current?.select();
      }, 100);
    }

    if (currentPage === 'PROD_INPUT') {
      setProdWoScan('');
      setSelectedWo(null);
      setSelectedSubPart(null);
      setPendingSubPart(null);

      setProdQty(0);
      setProdAccordionOpen(false);
      setProdSubModalOpen(false);

      setProdLocation('');
      setProdWarehouse('');
      setProdLocationInputMode('none');
      setProdLocationReadOnly(false);

      setProdErrorTarget('wo');
      setProdWoInputMode('none');

      setTimeout(() => {
        prodWoInputRef.current?.focus();
      }, 150);
    }

    if (currentPage === 'OUT') {
      setOutLocScan('');
      setOutWarehouse('');
      setSelectedOutItem(null);
      setPendingOutItem(null);
      setOutQty(0);
      setOutAccordionOpen(false);
      setOutListModalOpen(false);
      setOutModalOpenCode(null);
      setOutModalOpenName(null);
      setOutLocInputMode('none');

      setTimeout(() => {
        outLocRef.current?.focus();
      }, 150);
    }
  }, [currentPage]);

  // ==========================================
  // 유틸리티 함수들
  // ==========================================
  const checkProdMainOverflow = (key: string, el: HTMLDivElement | null) => {
    if (!el) return;

    const isOverflow = el.scrollWidth > el.clientWidth;

    setProdMainOverflowMap((prev) => {
      if (prev[key] === isOverflow) return prev;

      return {
        ...prev,
        [key]: isOverflow
      };
    });
  };

  const checkProdOverflow = (key: string, el: HTMLDivElement | null) => {
    if (!el) return;

    const isOverflow = el.scrollWidth > el.clientWidth;

    setProdOverflowMap((prev) => {
      if (prev[key] === isOverflow) return prev;

      return {
        ...prev,
        [key]: isOverflow
      };
    });
  };

  const showLoading = (callback) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (callback) callback();
    }, 600);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginId === 'tester' && loginPw === '1234') {
      showLoading(() => {
        setUser({ id: 'tester', name: '홍길동', dept: '생산팀' });
        setCurrentPage('MAIN');
      });
    } else if (loginId === 'worker01') {
      // PDF 기본 worker01 로그인 허용
      showLoading(() => {
        setUser({ id: 'worker01', name: '홍길동', dept: '생산팀' });
        setCurrentPage('MAIN');
      });
    } else {
      setErrorMsg('아이디 또는 비밀번호가 잘못되었습니다. (테스트용 ID: tester / PW: 1234)');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowUserModal(false);
    setCurrentPage('LOGIN');
  };

  // 가상 음성 입력 토글 함수
  // 실제 브라우저 음성 입력 토글 함수
  const toggleVoiceRecording = (targetField, currentVal, setter) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('현재 브라우저에서는 음성 입력을 지원하지 않습니다. 모바일 크롬에서 테스트해 주세요.');
      return;
    }

    // 이미 녹음 중이면 사용자가 직접 종료한 것으로 처리
    if (isVoiceRecording && voiceTarget === targetField) {
      voiceManualStopRef.current = true;

      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.stop();
        voiceRecognitionRef.current = null;
      }

      setIsVoiceRecording(false);
      setVoiceTarget(null);
      return;
    }

    // 다른 필드 녹음 중이면 먼저 종료
    if (voiceRecognitionRef.current) {
      voiceManualStopRef.current = true;
      voiceRecognitionRef.current.stop();
      voiceRecognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();

    voiceManualStopRef.current = false;

    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let baseText = currentVal || '';

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      const nextText = `${baseText} ${finalText || interimText}`.trim();
      setter(nextText);

      if (finalText) {
        baseText = nextText;
      }
    };

    recognition.onerror = (event: any) => {
      setIsVoiceRecording(false);
      setVoiceTarget(null);
      voiceRecognitionRef.current = null;

      if (event?.error === 'not-allowed') {
        setErrorMsg('마이크 권한이 거부되었습니다. 브라우저 권한을 허용해 주세요.');
        return;
      }

      setErrorMsg('음성 입력 중 오류가 발생했습니다.');
    };

    recognition.onend = () => {
      voiceRecognitionRef.current = null;

      // 사용자가 직접 끈 경우만 종료 상태 유지
      if (voiceManualStopRef.current) {
        setIsVoiceRecording(false);
        setVoiceTarget(null);
        return;
      }

      // 브라우저가 자동으로 끊으면 다시 시작 시도
      try {
        const nextRecognition = new SpeechRecognition();

        nextRecognition.lang = 'ko-KR';
        nextRecognition.continuous = true;
        nextRecognition.interimResults = true;
        nextRecognition.onresult = recognition.onresult;
        nextRecognition.onerror = recognition.onerror;
        nextRecognition.onend = recognition.onend;

        voiceRecognitionRef.current = nextRecognition;
        nextRecognition.start();
      } catch (e) {
        setIsVoiceRecording(false);
        setVoiceTarget(null);
      }

      recognition.start();
    };

    voiceRecognitionRef.current = recognition;
    setIsVoiceRecording(true);
    setVoiceTarget(targetField);

    recognition.start();
  };

  const stopVoiceRecordingIfActive = () => {
    if (!isVoiceRecording) return;

    voiceManualStopRef.current = true;

    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stop();
      voiceRecognitionRef.current = null;
    }

    setIsVoiceRecording(false);
    setVoiceTarget(null);
  };

  // 공통 창고 중복 판단 핸들러
  const checkWarehouseOverlap = (locationCode, onConfirmSelection, title) => {
    const matchedWHs = findWarehousesByCode(locationCode);
    if (matchedWHs.length > 1) {
      setWarehouseSelector({
        options: matchedWHs,
        onSelect: (selectedWH) => {
          setWarehouseSelector(null);
          onConfirmSelection(selectedWH);
        },
        title: title || '창고 선택'
      });
      return true;
    } else if (matchedWHs.length === 1) {
      onConfirmSelection(matchedWHs[0]);
      return false;
    } else {
      // 매칭되는 창고 없음 (랜덤 배정 또는 기본 창고 처리)
      onConfirmSelection('본사');
      return false;
    }
  };

  // ==========================================
  // 각 시나리오별 이벤트 핸들러
  // ==========================================

  // [1. 부품입고]

  const focusPartsScanForBarcode = () => {
    setPartsScanInputMode('none');

    setTimeout(() => {
      partsInputRef.current?.focus();
      partsInputRef.current?.select();
    }, 100);
  };

  const focusPartsScanWithoutKeyboard = () => {
    setPartsLocationInputMode('none');
    setPartsLocationReadOnly(true);

    setTimeout(() => {
      partsInputRef.current?.focus();
      partsInputRef.current?.select();
    }, 100);

    setTimeout(() => {
      setPartsScanReadOnly(false);
    }, 300);
  };

  const focusPartsLocationForBarcode = () => {
    setPartsLocationInputMode('none');
    setPartsLocationReadOnly(false);

    setTimeout(() => {
      partsLocationRef.current?.focus();
      partsLocationRef.current?.select();
    }, 100);
  };

  const hidePdaKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handlePartsScanSearch = (scanValue = partsInputScan) => {
    const scannedValue = scanValue.trim();

    if (!scannedValue) {
      setErrorMsg('품번 바코드를 스캔해주세요.');

      focusPartsScanWithoutKeyboard();

      return;
    }

    const normalized = scannedValue.toLowerCase();

    const found = ARRIVAL_MOCK.find((item) => {
      return (
        item.code.toLowerCase() === normalized ||
        item.code.toLowerCase().includes(normalized)
      );
    });

    if (found) {
      showLoading(() => {
        hidePdaKeyboard();

        const matchedItems = ARRIVAL_MOCK.filter((item) => {
          return item.code.toLowerCase() === found.code.toLowerCase();
        });

        setPartsModalTitle('입하목록 선택');
        setPartsModalItems(matchedItems.length > 0 ? matchedItems : [found]);
        setPartsModalOpen(true);

        setSelectedArrival(null);
        setPartsInputQty(0);
        setPartsListOpen(false);
        setPartsLocation('');
        setPartsWarehouse('');
        setPartsErrorTarget('scan');
      });
    } else {
      hidePdaKeyboard();

      setSelectedArrival(null);
      setPartsInputQty(0);
      setPartsListOpen(false);
      setPartsModalOpen(false);

      setErrorMsg(
        '입하 정보를 찾을 수 없습니다\n스캔한 품번 정보가 존재하지 않습니다.\n기준 정보를 확인해 주십시오.'
      );
    }
  };

  const handlePartsLocationScan = (locValue = partsLocation) => {
    const loc = locValue.trim();

    setPartsLocation(loc);

    if (!loc) {
      setPartsErrorTarget('location');
      hidePdaKeyboard();
      setErrorMsg('입고 위치를 스캔해 주세요.');
      return;
    }

    const matchedWHs = findWarehousesByCode(loc);

    if (matchedWHs.length === 0) {
      setPartsErrorTarget('location');
      setPartsWarehouse('');
      hidePdaKeyboard();

      setErrorMsg('입고 위치를 찾을 수 없습니다\n스캔한 위치 정보가 존재하지 않습니다.\n기준 정보를 확인해 주십시오.');
      return;
    }

    hidePdaKeyboard();

    checkWarehouseOverlap(
      loc,
      (warehouse) => {
        setPartsWarehouse(warehouse);
        hidePdaKeyboard();
      },
      '입고 창고 선택'
    );
  };

  // [2. 생산품입고]
  const handleGoodsScanSearch = (scanValue = goodsScan) => {
    const scannedValue = scanValue.trim();

    if (!scannedValue) {
      hidePdaKeyboard();

      setSelectedGoods(null);
      setGoodsLocation('');
      setGoodsQty(0);
      setGoodsAccordionOpen(false);
      setWarehouseSelector(null);
      setGoodsErrorTarget('scan');

      setErrorMsg('품번 바코드를 스캔해 주세요.');

      setTimeout(() => {
        goodsInputRef.current?.focus();
        goodsInputRef.current?.select();
      }, 300);

      return;
    }

    const found = FINISHED_GOODS_MOCK.find(item =>
      item.code.toLowerCase().includes(scannedValue.toLowerCase())
    );

    if (found) {
      showLoading(() => {
        setSelectedGoods(found);
        setGoodsQty(found.qty);
        setGoodsAccordionOpen(false);

        // 자동 포커스 때는 키패드 방지
        setGoodsLocationInputMode('none');
        setGoodsLocationReadOnly(true);

        setTimeout(() => {
          goodsLocationRef.current?.focus();
          goodsLocationRef.current?.select();

          // 스캔 입력 받을 수 있게 다시 해제
          setTimeout(() => {
            setGoodsLocationReadOnly(false);
          }, 300);
        }, 100);
      });
    } else {
      hidePdaKeyboard();

      setSelectedGoods(null);
      setGoodsLocation('');
      setGoodsQty(0);
      setGoodsAccordionOpen(false);
      setWarehouseSelector(null);
      setGoodsErrorTarget('scan');

      setErrorMsg('제품을 찾을 수 없습니다\n스캔한 바코드 정보가 존재하지 않습니다.\n기준 정보를 확인해 주십시오.');

      setTimeout(() => {
        goodsInputRef.current?.focus();
        goodsInputRef.current?.select();
      }, 300);
    }
  };

  const handleGoodsLocationScan = (locValue = goodsLocation) => {
    const loc = locValue.trim();
    setGoodsLocation(loc);

    if (!loc) return;

    const matchedWHs = findWarehousesByCode(loc);

    if (matchedWHs.length === 0) {
      setGoodsErrorTarget('location');
      hidePdaKeyboard();

      setErrorMsg('입고 위치를 찾을 수 없습니다\n스캔한 위치 정보가 존재하지 않습니다.\n기준 정보를 확인해 주십시오.');

      return;
    }

    // 중복팝업 뜨기전에 키패드 숨기기
    hidePdaKeyboard();

    checkWarehouseOverlap(loc, (warehouse) => {
      setProdWarehouse(warehouse);
      hidePdaKeyboard();
    }, '창고 선택');
  };

  // [3. 생산투입]
  const focusProdWoForBarcode = () => {
    setProdWoInputMode('none');

    setTimeout(() => {
      prodWoInputRef.current?.focus();
    }, 100);
  };

  const focusProdLocationForBarcode = () => {
    setProdLocationInputMode('none');
    setProdLocationReadOnly(true);

    setTimeout(() => {
      prodLocationRef.current?.focus();
      prodLocationRef.current?.select();
    }, 100);

    setTimeout(() => {
      setProdLocationReadOnly(false);
    }, 300);
  };

  const handleProdWoSearch = (scanValue = prodWoScan) => {
    const target = scanValue.trim();

    if (!target) {
      setProdErrorTarget('wo');
      hidePdaKeyboard();
      setErrorMsg('작업지시 번호를 스캔해 주세요.');
      return;
    }

    const found = WORK_ORDERS_MOCK[target];

    if (found) {
      showLoading(() => {
        hidePdaKeyboard();

        setSelectedWo(found);
        setSelectedSubPart(null);
        setPendingSubPart(null);
        setProdMainOpenCode(false);
        setProdMainOpenName(false);
        setProdMainOverflowMap({});

        setProdModalOpenPartCode(null);
        setProdModalOpenPartName(null);
        setProdModalOpenLocation(null);
        setProdModalVisibleCount(3);

        setProdQty(0);
        setProdLocation('');
        setProdWarehouse('');
        setProdAccordionOpen(false);
        setProdSubModalOpen(true);
      });

      return;
    }

    hidePdaKeyboard();

    setSelectedWo(null);
    setSelectedSubPart(null);
    setProdLocation('');
    setProdWarehouse('');
    setProdQty(0);
    setProdAccordionOpen(false);
    setProdSubModalOpen(false);
    setProdErrorTarget('wo');

    setErrorMsg('작업지시 정보를 찾을 수 없습니다.\n스캔한 번호: ' + target);
  };

  const handleProdLocationScan = (locValue = prodLocation) => {
    const loc = locValue.trim();

    setProdLocation(loc);

    if (!loc) {
      setProdErrorTarget('location');
      hidePdaKeyboard();
      setErrorMsg('입고 위치를 스캔해 주세요.');
      return;
    }

    const matchedWHs = findWarehousesByCode(loc);

    if (matchedWHs.length === 0) {
      setProdErrorTarget('location');
      setProdWarehouse('');
      hidePdaKeyboard();

      setErrorMsg('입고 위치를 찾을 수 없습니다\n스캔한 위치 정보가 존재하지 않습니다.\n기준 정보를 확인해 주십시오.');
      return;
    }

    hidePdaKeyboard();

    checkWarehouseOverlap(
      loc,
      (warehouse) => {
        setProdWarehouse(warehouse);
        hidePdaKeyboard();
      },
      '입고 창고 선택'
    );
  };

  // [4. 출고]
  const handleOutLocScan = (scanValue = outLocScan) => {
    const target = scanValue.trim();

    if (!target) {
      hidePdaKeyboard();
      setErrorMsg('출고 위치를 스캔해 주세요.');
      return;
    }

    setOutLocScan(target);
    hidePdaKeyboard();

    const matchedWHs = findWarehousesByCode(target);

    if (matchedWHs.length === 0) {
      setSelectedOutItem(null);
      setPendingOutItem(null);
      setOutWarehouse('');
      setOutQty(1);
      setOutListModalOpen(false);
      hidePdaKeyboard();
      setErrorMsg('출고 위치를 찾을 수 없습니다.\n스캔한 위치 정보가 존재하지 않습니다.');
      return;
    }

    checkWarehouseOverlap(
      target,
      (warehouse) => {
        showLoading(() => {
          setOutWarehouse(warehouse);

          setSelectedOutItem(null);
          setPendingOutItem(null);
          setOutQty(1);
          setOutAccordionOpen(false);

          setOutModalOpenCode(null);
          setOutModalOpenName(null);
          setOutListModalOpen(true);
        });
      },
      '창고 선택'
    );
  };

  // [5. 재고이동]
  const handleTransFromLocScan = (scanValue = transFromLoc) => {
    const target = scanValue.trim();

    setTransFromLoc(target);
    hidePdaKeyboard();

    if (!target) {
      setErrorMsg('출발지 위치를 스캔해 주세요.');
      return;
    }

    const matchedWHs = findWarehousesByCode(target);

    if (matchedWHs.length === 0) {
      setTransSelectedPart(null);
      setPendingTransPart(null);
      setTransQty(0);
      setTransListModalOpen(false);
      setErrorMsg('등록되지 않은 위치입니다.');
      return;
    }

    checkWarehouseOverlap(
      target,
      () => {
        showLoading(() => {
          setTransSelectedPart(null);
          setPendingTransPart(null);
          setTransQty(0);
          setTransAccordionOpen(false);
          setTransModalOpenCode(null);
          setTransModalOpenName(null);
          setTransListModalOpen(true);
        });
      },
      '출발 창고 선택'
    );
  };

  const handleTransToLocScan = (scanValue = transToLoc) => {
    const target = scanValue.trim();

    setTransToLoc(target);
    hidePdaKeyboard();

    if (!target) {
      setErrorMsg('도착지 위치를 스캔해 주세요.');
      return;
    }

    const matchedWHs = findWarehousesByCode(target);

    if (matchedWHs.length === 0) {
      setErrorMsg('등록되지 않은 이동위치입니다.');
      return;
    }

    checkWarehouseOverlap(
      target,
      () => {
        setTimeout(() => {
          transToLocRef.current?.focus();
          transToLocRef.current?.select();
        }, 150);
      },
      '도착 창고 선택'
    );
  };

  const resetTransForm = () => {
    setTransFromLoc('');
    setTransSelectedPart(null);
    setPendingTransPart(null);
    setTransToLoc('');
    setTransQty(0);
    setTransReason('');
    setTransAccordionOpen(false);
    setTransListModalOpen(false);
    setTransModalOpenCode(null);
    setTransModalOpenName(null);
  };

  const stopTransQrScan = () => {
    transQrStreamRef.current?.getTracks().forEach((track) => track.stop());
    transQrStreamRef.current = null;
    setTransQrOpen(false);
    setTransQrTarget(null);
  };

  const startTransQrScan = (target: 'from' | 'to') => {
    setTransQrTarget(target);
    setTransQrOpen(true);

    setTimeout(() => {
      runTransQrScan(target);
    }, 300);
  };

  const runTransQrScan = async (target: 'from' | 'to') => {
    try {
      const video = transQrVideoRef.current;

      if (!video) {
        setErrorMsg('카메라 화면을 찾을 수 없습니다.');
        stopTransQrScan();
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('이 브라우저는 카메라 스캔을 지원하지 않습니다.');
        stopTransQrScan();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        },
        audio: false
      });

      transQrStreamRef.current = stream;
      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          resolve();
        };
      });

      await video.play();

      const reader = new BrowserMultiFormatReader();

      const result = await reader.decodeOnceFromVideoElement(video);
      const value = result.getText();

      stopTransQrScan();

      if (target === 'from') {
        setTransFromLoc(value);
        handleTransFromLocScan(value);
        return;
      }

      setTransToLoc(value);
      handleTransToLocScan(value);
    } catch (e) {
      console.error('QR scan error:', e);

      stopTransQrScan();

      setErrorMsg(
        '카메라 스캔에 실패했습니다.\n모바일 브라우저 권한 또는 HTTPS 환경을 확인해 주세요.'
      );
    }
  };

  // [6. 재고실사]
  const handleInspectLocScan = (val) => {
    setInspectLoc(val);
    if (value.trim()) {
      checkWarehouseOverlap(val, (wh) => {
        // 실사 대상 품목 로드
        setInspectSelectedPart({
          code: 'RM-ENS-02-VERY-LONG-PART-NAME-2026-A-B-C',
          name: '이랜시스 통합 제어 모듈_베이스온_테스트_2',
          qty: 4
        });
        setInspectQty(4);
      }, '실사 창고 선택');
    }
  };


  // 등록 완료 범용 핸들러
  const triggerSuccessSubmit = (menuTitle, resetStateFn) => {
    setConfirmMsg({
      text: '등록 처리를 진행하시겠습니까?',
      onConfirm: () => {
        setConfirmMsg(null);
        showLoading(() => {
          setSuccessMsg(`${menuTitle} 등록이 완료되었습니다.`);
          if (resetStateFn) resetStateFn();
        });
      }
    });
  };

  return (
  <div style={{
    width: '100vw',
    minHeight: '100dvh',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#F7FAFC',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'stretch',
  }}>
    <div style={{
      width: '100%',
      maxWidth: '720px',
      minHeight: '100dvh',
      backgroundColor: COLORS.white,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
        
        {/* ========================================== */}
        {/* [공통 헤더 영역] - 로그인 상태 아닐 때는 비노출 */}
        {/* ========================================== */}
        {currentPage !== 'LOGIN' && (
          <header style={{
            backgroundColor: COLORS.darkBg,
            color: COLORS.white,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '56px',
            boxSizing: 'border-box',
            zIndex: 10
          }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {false && currentPage !== 'MAIN' && (
                <button 
                  onClick={() => {
                    if (currentPage === 'TRANS') {
                      resetTransForm();
                    }

                    setCurrentPage('MAIN');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.white,
                    fontSize: '20px',
                    padding: '0 8px 0 0',
                    cursor: 'pointer'
                  }}
                >
                  &larr;
                </button>
              )}
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                {currentPage === 'MAIN' ? '재고관리 PDA' : (
                  currentPage === 'PARTS_IN' ? '부품입고' :
                  currentPage === 'finished_IN' ? '생산품입고' :
                  currentPage === 'PROD_INPUT' ? '생산투입' :
                  currentPage === 'OUT' ? '출고' :
                  currentPage === 'TRANS' ? '재고이동' :
                  currentPage === 'INSPECT' ? '재고실사' : '재고관리 PDA'
                )}
              </h1>
            </div>

            {/* 우측 상단 유저 아이콘 및 햄버거 결합형 프로필 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {currentPage === 'MAIN' && (
                <button 
                  onClick={() => setShowUserModal(true)}
                  style={{
                    background: '#FFFFFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    padding: '0'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
              )}
              {currentPage !== 'MAIN' && (
                <button 
                  onClick={() => setCurrentPage('MAIN')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A0AEC0',
                    fontSize: '18px',
                    cursor: 'pointer',
                    paddingLeft: '4px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </header>
        )}

        {/* ========================================== */}
        {/* [메인 컨텐츠 영역] */}
        {/* ========================================== */}
        <div style={{
          flex: 1,
          backgroundColor: '#F7FAFC',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>

          {/* ------------------------------------------ */}
          {/* [화면 0] 로그인 화면 (LOGIN) */}
          {/* ------------------------------------------ */}
          {currentPage === 'LOGIN' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.darkBg, margin: '0 0 8px 0' }}>EPIC SYSTEMS</h2>
                <p style={{ fontSize: '15px', color: COLORS.textMuted, margin: 0 }}>재고관리 PDA 로그인</p>
              </div>

              <form onSubmit={handleLogin} style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '6px' }}>아이디</label>
                  <input 
                    type="text" 
                    value={loginId} 
                    onChange={(e) => setLoginId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '52px',
                      borderRadius: '10px',
                      border: `1.5px solid ${COLORS.border}`,
                      padding: '0 16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      boxSizing: 'border-box',
                      backgroundColor: '#F8FAFC'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '6px' }}>비밀번호</label>
                  <input 
                    type="password" 
                    value={loginPw} 
                    onChange={(e) => setLoginPw(e.target.value)}
                    style={{
                      width: '100%',
                      height: '52px',
                      borderRadius: '10px',
                      border: `1.5px solid ${COLORS.border}`,
                      padding: '0 16px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      backgroundColor: '#F8FAFC'
                    }}
                  />
                </div>

                <button 
                  type="submit"
                  style={{
                    backgroundColor: COLORS.primary,
                    color: COLORS.white,
                    height: '54px',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '24px',
                    boxShadow: '0 4px 12px rgba(242, 114, 28, 0.2)'
                  }}
                >
                  로그인
                </button>
              </form>

              <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: COLORS.textMuted }}>
                데모 전용: tester / 1234
              </div>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* [화면 1] 메인 메뉴 (MAIN) */}
          {/* ------------------------------------------ */}
          {currentPage === 'MAIN' && (
            <div style={{
              flex: 1,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F0F4F8',
              justifyContent: 'flex-start'
            }}>
              {/* 6개 메뉴 그리드 레이아웃 (개선안 PPT 반영) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                flex: 'none'
              }}>
                {[
                  { id: 'PARTS_IN', title: '부품입고', desc: 'MATERIAL IN', icon: '📦' },
                  { id: 'finished_IN', title: '생산품입고', desc: 'PRODUCT IN', icon: '🏭' },
                  { id: 'OUT', title: '출고', desc: 'DELIVERY', icon: '🚚' },
                  { id: 'PROD_INPUT', title: '생산투입', desc: 'PROD INPUT', icon: '⚙️' },
                  { id: 'TRANS', title: '재고이동', desc: 'STOCK TRANS', icon: '🔄' },
                  { id: 'INSPECT', title: '재고실사', desc: 'INSPECTION', icon: '📝' }
                ].map((menu) => (
                  <button 
                    key={menu.id}
                    onClick={() => {
                      showLoading(() => {
                        if (menu.id === 'TRANS') {
                          resetTransForm();
                        }

                        setCurrentPage(menu.id);
                      });
                    }}
                    style={{
                      backgroundColor: COLORS.white,
                      border: 'none',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '16px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                      transition: 'transform 0.1s',
                      boxSizing: 'border-box'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ fontSize: '32px', marginBottom: '8px' }}>{menu.icon}</span>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: COLORS.darkBg, marginBottom: '2px' }}>{menu.title}</span>
                    <span style={{ fontSize: '10px', color: COLORS.textMuted, letterSpacing: '0.5px' }}>{menu.desc}</span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '10px', color: COLORS.textMuted, textAlign: 'center', marginTop: '10px' }}>
                EPIC SYSTEMS PDA RENEWAL SPECIFICATION V1.3
              </div>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* [화면 2] 부품입고 (PARTS_IN) */}
          {/* ------------------------------------------ */}
          {currentPage === 'PARTS_IN' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '14px',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF'
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: COLORS.textMuted,
                    marginBottom: '6px'
                  }}
                >
                  품번
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    ref={partsInputRef}
                    type="text"
                    autoComplete="off"
                    inputMode={partsScanInputMode}
                    placeholder="품번 바코드 스캔"
                    value={partsInputScan}
                    onInput={(e) => {
                      setPartsInputScan(e.currentTarget.value);
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onFocus={(e) => {
                      setPartsScanInputMode('none');
                      e.currentTarget.select();
                    }}
                    onClick={(e) => {
                      setPartsScanInputMode('text');
                      e.currentTarget.select();
                    }}
                    onChange={(e) => setPartsInputScan(e.target.value)}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();

                        const value = e.currentTarget.value;
                        setPartsInputScan(value);
                        handlePartsScanSearch(value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: `2px solid ${COLORS.primary}`,
                      padding: '0 42px 0 12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: COLORS.textMain,
                      WebkitTouchCallout: 'none',
                      userSelect: 'text',
                      WebkitUserSelect: 'text'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '13px',
                      color: COLORS.primary
                    }}
                  >
                    <SvgBarcode />
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: `1px solid ${COLORS.border}`,
                  padding: '10px 12px',
                  marginBottom: '10px'
                }}
              >
                <div
                  style={{
                    borderBottom: `1px dashed ${COLORS.border}`,
                    paddingBottom: '10px',
                    marginBottom: '10px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textMuted,
                      fontWeight: 'bold',
                      marginBottom: '6px'
                    }}
                  >
                    입하번호
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '14px',
                        fontWeight: '800',
                        color: selectedArrival ? COLORS.textMain : '#A0AEC0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedArrival ? selectedArrival.id : '-'}
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        color: COLORS.primary,
                        flexShrink: 0
                      }}
                    >
                      {selectedArrival ? `재고: ${selectedArrival.qty} EA` : ''}
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textMuted,
                      fontWeight: 'bold',
                      marginBottom: '6px'
                    }}
                  >
                    품명
                  </div>

                  <div
                    onClick={() => selectedArrival && setPartsListOpen(!partsListOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: selectedArrival ? 'pointer' : 'default'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '14px',
                        fontWeight: '800',
                        color: selectedArrival ? COLORS.textMain : '#F97316',
                        whiteSpace: partsListOpen ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.35',
                        wordBreak: partsListOpen ? 'keep-all' : 'normal'
                      }}
                    >
                      {selectedArrival ? selectedArrival.name : '스캔 시 품명 표시'}
                    </div>

                    {selectedArrival && (
                      <span
                        style={{
                          color: COLORS.primary,
                          flexShrink: 0
                        }}
                      >
                        {partsListOpen ? <SvgChevronUp /> : <SvgChevronDown />}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: COLORS.textMuted,
                    marginBottom: '6px'
                  }}
                >
                  입고 위치
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    ref={partsLocationRef}
                    type="text"
                    autoComplete="off"
                    inputMode={partsLocationInputMode}
                    readOnly={partsLocationReadOnly}
                    placeholder="위치 스캔"
                    value={partsLocation}
                    disabled={!selectedArrival}
                    onContextMenu={(e) => e.preventDefault()}
                    onFocus={() => {
                      setPartsLocationInputMode('none');
                      setPartsLocationReadOnly(false);
                    }}
                    onClick={(e) => {
                      setPartsLocationReadOnly(false);
                      setPartsLocationInputMode('text');
                      e.currentTarget.select();
                    }}
                    onChange={(e) => setPartsLocation(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePartsLocationScan(e.currentTarget.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: `2px solid ${COLORS.primary}`,
                      padding: '0 42px 0 12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      boxSizing: 'border-box',
                      backgroundColor: selectedArrival ? '#FFFFFF' : '#F1F5F9',
                      color: COLORS.textMain
                    }}
                  />

                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '13px',
                      color: COLORS.primary
                    }}
                  >
                    <SvgBarcode />
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: COLORS.textMuted,
                    marginBottom: '8px'
                  }}
                >
                  입고수량
                </label>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setPartsInputQty(Math.max(0, partsInputQty - 1));
                      hidePdaKeyboard();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      document.getElementById('partsQtyInput')?.blur();
                    }}
                    disabled={!selectedArrival}
                    style={{
                      width: '84px',
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      border: `1px solid #CBD5E1`,
                      fontSize: '20px',
                      fontWeight: 'bold',
                      cursor: selectedArrival ? 'pointer' : 'default',
                      color: selectedArrival ? COLORS.textMain : '#A0AEC0'
                    }}
                  >
                    -
                  </button>

                  <input
                    ref={partsQtyRef}
                    id="partsQtyInput"
                    type="number"
                    value={partsInputQty}
                    disabled={!selectedArrival}
                    onClick={(e) => e.currentTarget.select()}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setPartsInputQty(Number(e.target.value))}
                    style={{
                      width: '198px',
                      maxWidth: '200px',
                      flexShrink: 1,
                      height: '44px',
                      textAlign: 'center',
                      fontSize: '18px',
                      fontWeight: '800',
                      border: `2px solid ${COLORS.primary}`,
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: selectedArrival ? COLORS.textMain : '#A0AEC0',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                  />

                  <button
                    onClick={() => {
                      setPartsInputQty(partsInputQty + 1);
                      hidePdaKeyboard();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      document.getElementById('partsQtyInput')?.blur();
                    }}
                    disabled={!selectedArrival}
                    style={{
                      width: '84px',
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      border: `1px solid #CBD5E1`,
                      fontSize: '20px',
                      fontWeight: 'bold',
                      cursor: selectedArrival ? 'pointer' : 'default',
                      color: selectedArrival ? COLORS.textMain : '#A0AEC0'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ flex: 1 }} />

              <button
                onClick={() => {
                  if (!selectedArrival) return;

                  triggerSuccessSubmit('부품입고', () => {
                    setSelectedArrival(null);
                    setPartsInputScan('');
                    setPartsInputQty(0);
                    setPartsListOpen(false);

                    setTimeout(() => {
                      focusPartsScanForBarcode();
                    }, 100);
                  });
                }}
                disabled={!selectedArrival}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: selectedArrival ? COLORS.primary : '#CBD5E0',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: selectedArrival ? 'pointer' : 'default'
                }}
              >
                입고 완료
              </button>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* [화면 3] 생산품입고 (finished_IN) */}
          {/* ------------------------------------------ */}
          {currentPage === 'finished_IN' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '10px 14px 8px',
              boxSizing: 'border-box',
              backgroundColor: '#FFFFFF'
            }}>

              {/* 품번 스캔 */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: COLORS.textMuted,
                  marginBottom: '6px'
                }}>
                  품번
                </label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      ref={goodsInputRef}
                      type="text"
                      autoComplete="off"
                      inputMode={goodsScanInputMode}
                      placeholder="품번 바코드 스캔"
                      value={goodsScan}
                      onContextMenu={(e) => e.preventDefault()}
                      onFocus={(e) => {
                        setGoodsScanInputMode('none');
                        e.currentTarget.select();
                      }}
                      onClick={(e) => {
                        setGoodsScanInputMode('text');
                        e.currentTarget.select();
                      }}
                      onChange={(e) => setGoodsScan(e.target.value)}
                      onInput={(e) => {
                        setGoodsScan(e.currentTarget.value);
                      }}
                      onKeyUp={(e) => {
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();

                          const value = e.currentTarget.value;
                          setGoodsScan(value);
                          handleGoodsScanSearch(value);
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '8px',
                        border: `2px solid ${COLORS.primary}`,
                        padding: '0 42px 0 12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                        backgroundColor: '#FFFFFF',
                        color: COLORS.textMain,
                        WebkitTouchCallout: 'none',
                        userSelect: 'text',
                        WebkitUserSelect: 'text'
                      }}
                    />

                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '13px',
                      color: COLORS.primary
                    }}>
                      <SvgBarcode />
                    </span>
                  </div>
                </div>
              </div>

              {/* 품명 / 재고 카드 */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: `1px solid ${COLORS.border}`,
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div
                  onClick={() => selectedGoods && setGoodsAccordionOpen(!goodsAccordionOpen)}
                  style={{
                    paddingBottom: '10px',
                    marginBottom: '10px',
                    borderBottom: `1px dashed #CBD5E1`,
                    cursor: selectedGoods ? 'pointer' : 'default'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '11px',
                        color: COLORS.textMuted,
                        fontWeight: 'bold',
                        marginBottom: '6px'
                      }}>
                        품명
                      </div>

                      <div style={{
                        fontSize: '14px',
                        color: selectedGoods ? COLORS.textMain : '#A0AEC0',
                        fontWeight: '800',
                        lineHeight: '1.35',
                        whiteSpace: goodsAccordionOpen ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '245px'
                      }}>
                        {selectedGoods ? selectedGoods.name : '제품 미선택'}
                      </div>
                    </div>

                    <span style={{ color: COLORS.primary, flexShrink: 0 }}>
                      {goodsAccordionOpen ? <SvgChevronUp /> : <SvgChevronDown />}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '11px',
                    color: COLORS.textMuted,
                    fontWeight: 'bold',
                    marginBottom: '6px'
                  }}>
                    재고
                  </div>

                  <div style={{
                    fontSize: '14px',
                    color: COLORS.textMain,
                    fontWeight: '800'
                  }}>
                    {selectedGoods ? selectedGoods.qty : 0} EA
                  </div>
                </div>
              </div>

              {/* 입고 위치 */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: COLORS.textMuted,
                  marginBottom: '6px'
                }}>
                  입고 위치
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    ref={goodsLocationRef}
                    type="text"
                    autoComplete="off"
                    inputMode={goodsLocationInputMode}
                    readOnly={goodsLocationReadOnly}
                    placeholder="위치 스캔"
                    value={goodsLocation}
                    disabled={!selectedGoods}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => {
                      // 사용자가 직접 터치했을 때만 키패드 허용
                      setGoodsLocationReadOnly(false);
                      setGoodsLocationInputMode('text');

                      setTimeout(() => {
                        e.currentTarget.focus();
                        e.currentTarget.select();
                      }, 0);
                    }}
                    onFocus={(e) => {
                      e.currentTarget.select();
                    }}
                    onChange={(e) => {
                      setGoodsLocation(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();

                        const value = e.currentTarget.value;
                        handleGoodsLocationScan(value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: `2px solid ${COLORS.primary}`,
                      padding: '0 42px 0 12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      boxSizing: 'border-box',
                      backgroundColor: selectedGoods ? '#FFFFFF' : '#F8FAFC',
                      color: selectedGoods ? COLORS.textMain : '#A0AEC0',
                      WebkitTouchCallout: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '13px',
                    color: COLORS.primary
                  }}>
                    <SvgBarcode />
                  </span>
                </div>
              </div>

              {/* 입고 수량 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: COLORS.textMuted,
                  marginBottom: '8px'
                }}>
                  입고 수량 (+/-)
                </label>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      document.activeElement?.blur();
                    }}
                    onClick={() => setGoodsQty(Math.max(0, goodsQty - 1))}
                    disabled={!selectedGoods}
                    style={{
                      width: '84px',
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      border: `1px solid #CBD5E1`,
                      fontSize: '20px',
                      fontWeight: 'bold',
                      cursor: selectedGoods ? 'pointer' : 'default',
                      color: selectedGoods ? COLORS.textMain : '#A0AEC0'
                    }}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={goodsQty}
                    disabled={!selectedGoods}
                    onClick={(e) => e.currentTarget.select()}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setGoodsQty(Number(e.target.value))}
                    onContextMenu={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        hidePdaKeyboard();
                      }
                    }}
                    style={{
                      width: '198px',
                      maxWidth: '200px',
                      height: '44px',
                      textAlign: 'center',
                      fontSize: '18px',
                      fontWeight: '800',
                      border: `2px solid ${COLORS.primary}`,
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: selectedGoods ? COLORS.textMain : '#A0AEC0',
                      WebkitTouchCallout: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  />

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      document.activeElement?.blur();
                    }}
                    onClick={() => setGoodsQty(goodsQty + 1)}
                    disabled={!selectedGoods}
                    style={{
                      width: '84px',
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      border: `1px solid #CBD5E1`,
                      fontSize: '20px',
                      fontWeight: 'bold',
                      cursor: selectedGoods ? 'pointer' : 'default',
                      color: selectedGoods ? COLORS.textMain : '#A0AEC0'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ flex: 1 }} />

              <button
                onClick={() => {
                  if (!selectedGoods || !goodsLocation) return;

                  triggerSuccessSubmit('생산품입고', () => {
                    setSelectedGoods(null);
                    setGoodsScan('');
                    setGoodsLocation('');
                    setGoodsQty(0);
                    setGoodsAccordionOpen(false);

                    setTimeout(() => {
                      goodsInputRef.current?.focus();
                      goodsInputRef.current?.select();
                    }, 100);
                  });
                }}
                disabled={!selectedGoods || !goodsLocation}
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: selectedGoods && goodsLocation ? COLORS.primary : '#CBD5E0',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: selectedGoods && goodsLocation ? 'pointer' : 'default'
                }}
              >
                입고 완료
              </button>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* [화면 4] 생산투입 (PROD_INPUT) */}
          {/* ------------------------------------------ */}
          {currentPage === 'PROD_INPUT' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '14px',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF'
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: COLORS.textMuted,
                    marginBottom: '6px'
                  }}
                >
                  작업지시번호
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    ref={prodWoInputRef}
                    type="text"
                    autoComplete="off"
                    inputMode={prodWoInputMode}
                    placeholder="작업지시 바코드 스캔"
                    value={prodWoScan}
                    onFocus={(e) => {
                      setProdWoInputMode('none');
                      e.currentTarget.select();
                    }}
                    onClick={(e) => {
                      setProdWoInputMode('text');
                      e.currentTarget.select();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseUp={(e) => e.preventDefault()}
                    onTouchCancel={(e) => e.preventDefault()}
                    onChange={(e) => setProdWoScan(e.currentTarget.value)}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();

                        const value = e.currentTarget.value;
                        setProdWoScan(value);
                        handleProdWoSearch(value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: `2px solid ${COLORS.primary}`,
                      padding: '0 42px 0 12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: COLORS.textMain,
                      WebkitTouchCallout: 'none',
                      userSelect: 'text',
                      WebkitUserSelect: 'text'
                    }}
                  />

                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '13px',
                      color: COLORS.primary
                    }}
                  >
                    <SvgBarcode />
                  </span>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  opacity: selectedWo ? 1 : 0.45,
                  pointerEvents: selectedWo ? 'auto' : 'none'
                }}
              >
                <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: `1px solid ${COLORS.border}`,
                  padding: '12px',
                  marginBottom: '12px'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: COLORS.textMuted,
                    fontWeight: 'bold',
                    marginBottom: '6px'
                  }}
                >
                  품번
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '10px',
                      width: '100%'
                    }}
                  >
                    <div
                      ref={(el) => checkProdMainOverflow('code', el)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        maxWidth: '100%',
                        fontSize: '14px',
                        color: selectedSubPart ? COLORS.textMain : '#A0AEC0',
                        fontWeight: '800',
                        lineHeight: '1.35',
                        whiteSpace: prodMainOpenCode ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: prodMainOpenCode ? 'break-all' : 'normal'
                      }}
                    >
                      {selectedSubPart ? selectedSubPart.code : '하위부품 미선택'}
                    </div>

                    {selectedSubPart && (prodMainOverflowMap.code || prodMainOpenCode) && (
                      <button
                        type="button"
                        onClick={() => setProdMainOpenCode(!prodMainOpenCode)}
                        style={{
                          width: '26px',
                          height: '26px',
                          border: 'none',
                          background: 'transparent',
                          color: COLORS.primary,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {prodMainOpenCode ? <SvgChevronUp /> : <SvgChevronDown />}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: `1px dashed ${COLORS.border}`,
                    paddingTop: '10px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textMuted,
                      fontWeight: 'bold',
                      marginBottom: '6px'
                    }}
                  >
                    품명
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '10px',
                      width: '100%'
                    }}
                  >
                    <div
                      ref={(el) => checkProdMainOverflow('name', el)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        maxWidth: '100%',
                        fontSize: '14px',
                        color: selectedSubPart ? COLORS.darkBg : '#A0AEC0',
                        fontWeight: '800',
                        lineHeight: '1.35',
                        whiteSpace: prodMainOpenName ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: prodMainOpenName ? 'keep-all' : 'normal'
                      }}
                    >
                      {selectedSubPart ? selectedSubPart.name : '-'}
                    </div>

                    {selectedSubPart && (prodMainOverflowMap.name || prodMainOpenName) && (
                      <button
                        type="button"
                        onClick={() => setProdMainOpenName(!prodMainOpenName)}
                        style={{
                          width: '26px',
                          height: '26px',
                          border: 'none',
                          background: 'transparent',
                          color: COLORS.primary,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {prodMainOpenName ? <SvgChevronUp /> : <SvgChevronDown />}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: `1px dashed ${COLORS.border}`,
                    paddingTop: '10px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textMuted,
                      fontWeight: 'bold',
                      marginBottom: '6px'
                    }}
                  >
                    필요수량/투입수량
                  </div>

                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '800',
                      color: selectedSubPart ? COLORS.darkBg : '#A0AEC0'
                    }}
                  >
                    {selectedSubPart
                      ? `${selectedSubPart.required} / ${selectedSubPart.current} EA`
                      : '0 / 0 EA'}
                  </div>
                </div>
              </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '6px' }}>
                    자재 투입 수량
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px minmax(0, 1fr) 52px',
                      gap: '8px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProdQty(Math.max(0, prodQty - 1));
                        hidePdaKeyboard();
                      }}
                      style={{
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: COLORS.lightBg,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg,
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>

                    <input
                      ref={prodQtyRef}
                      type="number"
                      value={prodQty}
                      onChange={(e) =>
                        setProdQty(Math.max(0, Number(e.currentTarget.value) || 0))
                      }
                      onClick={(e) => {
                        e.currentTarget.select();
                      }}
                      onFocus={(e) => {
                        e.currentTarget.select();
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        width: '100%',
                        minWidth: 0,
                        height: '44px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        border: `2px solid ${COLORS.primary}`,
                        borderRadius: '10px',
                        color: COLORS.textMain,
                        boxSizing: 'border-box'
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setProdQty(prodQty + 1);
                        hidePdaKeyboard();
                      }}
                      style={{
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: COLORS.lightBg,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg,
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>

                </div>
              </div>

              <button
                onClick={() => {
                  if (!selectedSubPart) return;

                  hidePdaKeyboard();

                  triggerSuccessSubmit('생산라인 자재투입', () => {
                    setSelectedWo(null);
                    setSelectedSubPart(null);
                    setProdWoScan('');
                    setProdLocation('');
                    setProdWarehouse('');
                    setProdQty(0);
                    setProdAccordionOpen(false);
                    focusProdWoForBarcode();
                  });
                }}
                disabled={!selectedSubPart}
                style={{
                  width: '100%',
                  height: '56px',
                  backgroundColor: selectedSubPart ? COLORS.primary : '#CBD5E0',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: 'bold'
                }}
              >
                투입 완료
              </button>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* [화면 5] 출고 (OUT) */}
          {/* ------------------------------------------ */}
          {currentPage === 'OUT' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '12px 14px 8px',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF'
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: COLORS.textMuted,
                    marginBottom: '6px'
                  }}
                >
                  위치
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    ref={outLocRef}
                    type="text"
                    autoComplete="off"
                    inputMode={outLocInputMode}
                    placeholder="위치 바코드 스캔"
                    value={outLocScan}
                    onContextMenu={(e) => e.preventDefault()}
                    onFocus={(e) => {
                      setOutLocInputMode('none');
                      e.currentTarget.select();
                    }}
                    onClick={(e) => {
                      setOutLocInputMode('text');
                      e.currentTarget.select();
                    }}
                    onChange={(e) => setOutLocScan(e.currentTarget.value)}
                    onInput={(e) => {
                      setOutLocScan(e.currentTarget.value);
                    }}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();

                        const value = e.currentTarget.value;

                        setOutLocScan(value);
                        handleOutLocScan(value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: `2px solid ${COLORS.primary}`,
                      padding: '0 42px 0 12px',
                      fontSize: '16px',
                      fontWeight: '700',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      color: COLORS.textMain,
                      WebkitTouchCallout: 'none',
                      userSelect: 'text',
                      WebkitUserSelect: 'text'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '13px',
                      color: COLORS.primary
                    }}
                  >
                    <SvgBarcode />
                  </span>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  opacity: selectedOutItem ? 1 : 0.45,
                  pointerEvents: selectedOutItem ? 'auto' : 'none'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.border}`,
                    padding: '10px 12px',
                    marginBottom: '12px'
                  }}
                >
                  <div
                    style={{
                      borderBottom: `1px dashed ${COLORS.border}`,
                      paddingBottom: '10px',
                      marginBottom: '10px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: COLORS.textMuted,
                        fontWeight: 'bold',
                        marginBottom: '6px'
                      }}
                    >
                      품번
                    </div>

                    <div
                      style={{
                        fontSize: '14px',
                        color: selectedOutItem ? COLORS.textMain : '#A0AEC0',
                        fontWeight: '800',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedOutItem ? selectedOutItem.code : '-'}
                    </div>
                  </div>

                  <div
                    onClick={() => selectedOutItem && setOutAccordionOpen(!outAccordionOpen)}
                    style={{
                      borderBottom: `1px dashed ${COLORS.border}`,
                      paddingBottom: '10px',
                      marginBottom: '10px',
                      cursor: selectedOutItem ? 'pointer' : 'default'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: COLORS.textMuted,
                        fontWeight: 'bold',
                        marginBottom: '6px'
                      }}
                    >
                      품명
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: '14px',
                          color: selectedOutItem ? COLORS.textMain : '#A0AEC0',
                          fontWeight: '800',
                          whiteSpace: outAccordionOpen ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.35',
                          wordBreak: outAccordionOpen ? 'keep-all' : 'normal'
                        }}
                      >
                        {selectedOutItem ? selectedOutItem.name : '-'}
                      </div>

                      {selectedOutItem && (
                        <span style={{ color: COLORS.primary, flexShrink: 0 }}>
                          {outAccordionOpen ? <SvgChevronUp /> : <SvgChevronDown />}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: COLORS.textMuted,
                        fontWeight: 'bold',
                        marginBottom: '6px'
                      }}
                    >
                      재고
                    </div>

                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: '800',
                        color: selectedOutItem ? COLORS.darkBg : '#A0AEC0'
                      }}
                    >
                      {selectedOutItem ? `${selectedOutItem.qty}EA` : '0EA'}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: COLORS.textMuted,
                      marginBottom: '6px'
                    }}
                  >
                    출고수량
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px minmax(0, 1fr) 52px',
                      gap: '8px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOutQty(Math.max(0, outQty - 1));
                        hidePdaKeyboard();
                      }}
                      style={{
                        height: '48px',
                        borderRadius: '10px',
                        backgroundColor: COLORS.lightBg,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg
                      }}
                    >
                      -
                    </button>

                    <input
                      ref={outQtyRef}
                      type="number"
                      value={outQty}
                      onChange={(e) =>
                        setOutQty(Math.max(0, Number(e.currentTarget.value) || 0))
                      }
                      onFocus={(e) => e.currentTarget.select()}
                      onClick={(e) => e.currentTarget.select()}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        width: '100%',
                        minWidth: 0,
                        height: '48px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        border: `2px solid ${COLORS.primary}`,
                        borderRadius: '10px',
                        color: COLORS.textMain,
                        boxSizing: 'border-box'
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setOutQty(outQty + 1);
                        hidePdaKeyboard();
                      }}
                      style={{
                        height: '48px',
                        borderRadius: '10px',
                        backgroundColor: COLORS.lightBg,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!selectedOutItem) return;

                  hidePdaKeyboard();

                  triggerSuccessSubmit('출고 등록', () => {
                    setOutLocScan('');
                    setOutWarehouse('');
                    setSelectedOutItem(null);
                    setPendingOutItem(null);
                    setOutQty(0);
                    setOutAccordionOpen(false);

                    setTimeout(() => {
                      outLocRef.current?.focus();
                      outLocRef.current?.select();
                    }, 100);
                  });
                }}
                disabled={!selectedOutItem}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: selectedOutItem ? COLORS.primary : '#CBD5E0',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                출고 등록
              </button>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* [화면 6] 재고이동 (TRANS) */}
          {/* ------------------------------------------ */}
          {currentPage === 'TRANS' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                boxSizing: 'border-box'
              }}
            >
              {/* 출발 위치 스캔 */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '4px' }}>
                  위치
                </label>

                <div style={{ position: 'relative' }}>
                  <input 
                    ref={transFromLocRef}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode={transFromLocInputMode}
                    placeholder="위치 바코드 스캔"
                    value={transFromLoc}
                    onContextMenu={(e) => e.preventDefault()}
                    onFocus={(e) => {
                      stopVoiceRecordingIfActive();

                      setTransFromLocInputMode('none');
                      e.currentTarget.select();
                    }}
                    onClick={(e) => {
                      setTransFromLocInputMode('text');
                      e.currentTarget.select();
                    }}
                    onChange={(e) => setTransFromLoc(e.currentTarget.value)}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        handleTransFromLocScan(e.currentTarget.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: `1.5px solid ${transFromLoc ? COLORS.success : COLORS.primary}`,
                      padding: '0 36px 0 12px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => startTransQrScan('from')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '8px',
                      width: '28px',
                      height: '28px',
                      border: 'none',
                      background: 'transparent',
                      color: COLORS.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <SvgBarcode />
                  </button>
                </div>
              </div>

              {/* 품목 정보 영역 */}
              {/* 이동 대상 품목 아코디언 */}
              <div
                onClick={() => {
                  if (transSelectedPart) {
                    setTransAccordionOpen(!transAccordionOpen);
                  }
                }}
                style={{
                  backgroundColor: transSelectedPart && transAccordionOpen ? '#FFF7ED' : COLORS.white,
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.border}`,
                  padding: '0',
                  marginBottom: '10px',
                  cursor: transSelectedPart ? 'pointer' : 'default',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              >
                {!transSelectedPart && (
                  <div
                    style={{
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: COLORS.primary,
                      fontWeight: 'bold'
                    }}
                  >
                    위치 스캔 후 품목 선택
                  </div>
                )}

                {transSelectedPart && (
                  <>
                    {/* 접힘/펼침 공통 상단 요약줄 */}
                    <div
                      style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0 12px',
                        boxSizing: 'border-box',
                        backgroundColor: transAccordionOpen ? '#FFF7ED' : COLORS.white
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color: COLORS.darkBg,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {transSelectedPart.code}
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: COLORS.primary,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        재고 {transSelectedPart.qty} EA
                      </div>

                      <span style={{ color: COLORS.primary, display: 'flex', alignItems: 'center' }}>
                        {transAccordionOpen ? <SvgChevronUp /> : <SvgChevronDown />}
                      </span>
                    </div>

                    {/* 펼침 상세 영역 */}
                    {transAccordionOpen && (
                      <div
                        style={{
                          padding: '8px 12px 12px',
                          backgroundColor: '#FFF7ED',
                          borderTop: `1px solid ${COLORS.border}`
                        }}
                      >
                        <div style={{ fontSize: '10px', color: COLORS.textMuted, fontWeight: 'bold', marginBottom: '3px' }}>
                          품번
                        </div>

                        <div style={{ fontSize: '12px', color: COLORS.darkBg, fontWeight: 'bold', lineHeight: '1.35', marginBottom: '10px' }}>
                          {transSelectedPart.code}
                        </div>

                        <div style={{ fontSize: '10px', color: COLORS.textMuted, fontWeight: 'bold', marginBottom: '3px' }}>
                          품명
                        </div>

                        <div style={{ fontSize: '12px', color: COLORS.darkBg, fontWeight: 'bold', lineHeight: '1.35' }}>
                          {transSelectedPart.name}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 도착 위치 / 수량 / 사유 */}
              <div style={{ opacity: transSelectedPart ? 1 : 0.4, pointerEvents: transSelectedPart ? 'auto' : 'none', flex: 1 }}>
                
                {/* 목적지 위치 스캔 */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '4px' }}>
                    이동 위치
                  </label>

                  <div style={{ position: 'relative' }}>
                    <input 
                      ref={transToLocRef}
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode={transToLocInputMode}
                      placeholder="이동 위치 스캔"
                      value={transToLoc}
                      onContextMenu={(e) => e.preventDefault()}
                      onFocus={(e) => {
                        stopVoiceRecordingIfActive();

                        setTransToLocInputMode('none');
                        e.currentTarget.select();
                      }}
                      onClick={(e) => {
                        setTransToLocInputMode('text');
                        e.currentTarget.select();
                      }}
                      onChange={(e) => setTransToLoc(e.currentTarget.value)}
                      onKeyUp={(e) => {
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          handleTransToLocScan(e.currentTarget.value);
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '8px',
                        border: `1.5px solid ${transToLoc ? COLORS.success : COLORS.primary}`,
                        padding: '0 36px 0 12px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => startTransQrScan('to')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        background: 'transparent',
                        color: COLORS.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <SvgBarcode />
                    </button>
                  </div>
                </div>

                {/* 수량 설정 */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '4px' }}>
                    이동 수량
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setTransQty(Math.max(0, transQty - 1))}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.border}`, fontSize: '16px', fontWeight: 'bold' }}
                    >
                      -
                    </button>

                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={String(transQty)}
                      onFocus={(e) => {
                        stopVoiceRecordingIfActive();
                        e.currentTarget.select();
                      }}
                      onChange={(e) => {
                        const onlyNumber = e.target.value.replace(/[^0-9]/g, '');
                        setTransQty(onlyNumber === '' ? 0 : Number(onlyNumber));
                      }}
                      style={{ flex: 1, height: '38px', textAlign: 'center', fontSize: '15px', fontWeight: 'bold', border: `2px solid ${COLORS.primary}`, borderRadius: '8px' }}
                    />

                    <button 
                      onClick={() => setTransQty(transQty + 1)}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.border}`, fontSize: '16px', fontWeight: 'bold' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 이동 사유 */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '4px' }}>
                    이동 사유
                  </label>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      ref={transReasonRef}
                      type="text"
                      placeholder="사유를 입력해 주세요."
                      value={transReason}
                      onFocus={(e) => {
                        const target = e.currentTarget;

                        setTimeout(() => {
                          target.focus();
                          target.select();
                        }, 80);
                      }}
                      onClick={(e) => {
                        const target = e.currentTarget;

                        setTimeout(() => {
                          target.select();
                        }, 120);
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      onMouseUp={(e) => e.preventDefault()}
                      onChange={(e) => setTransReason(e.target.value)}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '8px',
                        border: `1.5px solid ${isVoiceRecording && voiceTarget === 'transReason' ? COLORS.primary : COLORS.border}`,
                        padding: '0 12px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                        backgroundColor: isVoiceRecording && voiceTarget === 'transReason' ? '#FFF5F0' : '#FFF',
                        WebkitTouchCallout: 'none',
                        userSelect: 'text',
                        WebkitUserSelect: 'text'
                      }}
                    />
                    <button 
                      type="button"
                      data-voice-button="transReason"
                      onClick={() => toggleVoiceRecording('transReason', transReason, setTransReason)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        backgroundColor: isVoiceRecording && voiceTarget === 'transReason' ? '#E53E3E' : COLORS.primary,
                        color: COLORS.white,
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <SvgMic />
                    </button>
                  </div>

                  {isVoiceRecording && voiceTarget === 'transReason' && (
                    <div style={{ fontSize: '10px', color: '#E53E3E', fontWeight: 'bold', marginTop: '2px', textAlign: 'right' }}>
                      🎙️ 음성 입력 중입니다. 마이크를 다시 누르면 종료됩니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 완료 버튼 */}
              <button 
                onClick={() => {
                  if (!transSelectedPart || !transToLoc || transQty <= 0) return;

                  triggerSuccessSubmit('재고이동', () => {
                    setTransSelectedPart(null);
                    setTransFromLoc('');
                    setTransToLoc('');
                    setTransQty(0);
                    setTransReason('');
                    setTransAccordionOpen(false);
                    setTransListModalOpen(false);
                  });
                }}
                disabled={!transSelectedPart || !transToLoc || transQty <= 0}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: (transSelectedPart && transToLoc && transQty > 0) ? COLORS.primary : '#CBD5E0',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                이동하기
              </button>
            </div>
          )}

          {/* ------------------------------------------ */}
          {/* [화면 7] 재고실사 (INSPECT) */}
          {/* ------------------------------------------ */}
          {currentPage === 'INSPECT' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', boxSizing: 'border-box' }}>
              
              {/* 실사 대상 위치 스캔 */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '4px' }}>실사 위치 스캔</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text"
                    placeholder="실사 창고 위치 스캔"
                    value={inspectLoc}
                    onChange={(e) => handleInspectLocScan(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: `1.5px solid ${inspectLoc ? COLORS.success : COLORS.primary}`,
                      padding: '0 36px 0 12px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '11px', color: COLORS.primary }}>
                    <SvgBarcode />
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>
                  중복 위치코드 테스트: <strong onClick={() => handleInspectLocScan('C03')} style={{ color: COLORS.primary, textDecoration: 'underline', cursor: 'pointer' }}>C03</strong>
                </div>
              </div>

              {/* 실사 대상 품목 정보 */}
              <div style={{ backgroundColor: COLORS.white, borderRadius: '12px', padding: '10px 14px', border: `1px solid ${COLORS.border}`, marginBottom: '10px' }}>
                <div 
                  onClick={() => setInspectAccordionOpen(!inspectAccordionOpen)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: 'bold' }}>실사 대상 품목 정보</span>
                  <span style={{ color: COLORS.primary }}>{inspectAccordionOpen ? <SvgChevronUp /> : <SvgChevronDown />}</span>
                </div>

                <div style={{ fontSize: '13px', color: COLORS.primary, fontWeight: 'bold', marginTop: '2px' }}>
                  {inspectSelectedPart ? inspectSelectedPart.code : '위치 스캔 시 로드'}
                </div>

                {inspectAccordionOpen && inspectSelectedPart && (
                  <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '4px', lineHeight: '1.4' }}>
                    품명: {inspectSelectedPart.name}<br />
                    전산 재고수량: <strong>{inspectSelectedPart.qty} EA</strong>
                  </div>
                )}
              </div>

              {/* 실사 수량 입력 및 실사사유 */}
              <div style={{ opacity: inspectSelectedPart ? 1 : 0.4, pointerEvents: inspectSelectedPart ? 'auto' : 'none', flex: 1 }}>
                
                {/* 실사 수량 조정 */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '4px' }}>실사수량 (+/-)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setInspectQty(Math.max(0, inspectQty - 1))} style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.border}`, fontSize: '16px', fontWeight: 'bold' }}>-</button>
                    <input 
                      type="number"
                      value={inspectQty}
                      onChange={(e) => setInspectQty(Number(e.target.value))}
                      style={{ flex: 1, height: '38px', textAlign: 'center', fontSize: '15px', fontWeight: 'bold', border: `2px solid ${COLORS.primary}`, borderRadius: '8px' }}
                    />
                    <button onClick={() => setInspectQty(inspectQty + 1)} style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.border}`, fontSize: '16px', fontWeight: 'bold' }}>+</button>
                  </div>
                </div>

                {/* 실사 사유 입력 및 최신 기능 음성 입력 */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, marginBottom: '4px' }}>실사 사유 기입</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text"
                      placeholder="실사 정정 사유 입력"
                      value={inspectReason}
                      onChange={(e) => setInspectReason(e.target.value)}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '8px',
                        border: `1.5px solid ${isVoiceRecording && voiceTarget === 'inspectReason' ? COLORS.primary : COLORS.border}`,
                        padding: '0 12px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        backgroundColor: isVoiceRecording && voiceTarget === 'inspectReason' ? '#FFF5F0' : '#FFF'
                      }}
                    />
                    <button 
                      onClick={() => toggleVoiceRecording('inspectReason', inspectReason, setInspectReason)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        backgroundColor: isVoiceRecording && voiceTarget === 'inspectReason' ? '#E53E3E' : COLORS.primary,
                        color: COLORS.white,
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <SvgMic />
                    </button>
                  </div>
                  {isVoiceRecording && voiceTarget === 'inspectReason' && (
                    <div style={{ fontSize: '10px', color: '#E53E3E', fontWeight: 'bold', marginTop: '2px', textAlign: 'right' }}>
                      🎙️ 음성 실시간 누적 분석 중...
                    </div>
                  )}
                </div>
              </div>

              {/* 수동 품목 선택 변경 모달 */}
              {inspectSelectedPart && (
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <button 
                    onClick={() => setInspectListModalOpen(true)}
                    style={{ background: 'none', border: 'none', color: COLORS.primary, fontSize: '12px', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    실사 대상 수동 리스트 조회 및 선택
                  </button>
                </div>
              )}

              {/* 하단 고정 등록 버튼 */}
              <button 
                onClick={() => {
                  if (!inspectSelectedPart) return;
                  triggerSuccessSubmit('재고실사', () => {
                    setInspectSelectedPart(null);
                    setInspectLoc('');
                  });
                }}
                disabled={!inspectSelectedPart}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: inspectSelectedPart ? COLORS.primary : '#CBD5E0',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                실사등록
              </button>
            </div>
          )}

        </div>

        {/* ========================================== */}
        {/* [모달 1] 우측 상단 유저 정보 모달 (Hamburger 대체) */}
        {/* ========================================== */}
        {showUserModal && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}>
            <div style={{
              width: '280px',
              backgroundColor: COLORS.white,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              textAlign: 'center',
              boxSizing: 'border-box',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                ×
              </button>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FEEBC8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <UserRound size={30} color="#F97316" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.darkBg, margin: '0 0 4px 0' }}>{user ? user.name : '홍길동'}</h3>
              <p style={{ fontSize: '14px', color: COLORS.textMuted, margin: '0 0 24px 0' }}>부서: {user ? user.dept : '생산팀'}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={handleLogout}
                  style={{
                    backgroundColor: COLORS.primary,
                    color: COLORS.white,
                    height: '44px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* [모달 2] 중복 위치코드 발생 시 창고 선택 모달 */}
        {/* ========================================== */}
        {transQrOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.75)',
              zIndex: 300,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                backgroundColor: COLORS.darkBg,
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '48px',
                  padding: '0 14px',
                  color: COLORS.white,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 'bold'
                }}
              >
                <span>{transQrTarget === 'from' ? '위치 스캔' : '이동위치 스캔'}</span>

                <button
                  type="button"
                  onClick={stopTransQrScan}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.white,
                    fontSize: '22px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>

              <video
                ref={transQrVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '280px',
                  backgroundColor: '#000',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }}
              />

              <div
                style={{
                  padding: '12px',
                  color: COLORS.white,
                  fontSize: '12px',
                  textAlign: 'center'
                }}
              >
                QR코드 또는 바코드를 카메라 중앙에 맞춰주세요.
              </div>
            </div>
          </div>
        )}
        {warehouseSelector && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 150,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}>
            <div style={{
              width: '290px',
              backgroundColor: COLORS.white,
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}>
              <div style={{ backgroundColor: COLORS.darkBg, color: COLORS.white, padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                <span>{warehouseSelector.title}</span>
                <span style={{ color: COLORS.primary }}>⚠️ 중복 발생</span>
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: COLORS.textMuted, margin: '0 0 12px 0', lineHeight: '1.4' }}>
                  동일한 위치코드가 여러 창고에 존재합니다. 입출고를 진행할 창고를 지정해 주십시오.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {warehouseSelector.options.map((wh) => (
                    <button
                      key={wh}
                      onClick={() => warehouseSelector.onSelect(wh)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1.5px solid ${COLORS.primary}`,
                        backgroundColor: '#FFF5F0',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: COLORS.primary,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      📍 {wh}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* [모달 3] 미입고 입하 목록 전체 조회 모달 (부품입고용) */}
        {/* ========================================== */}
        {partsModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '720px',
            height: '100svh',
            backgroundColor: COLORS.white,
            zIndex: 9999,
            display: 'grid',
            gridTemplateRows: '56px minmax(0, 1fr) 76px',
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: COLORS.darkBg,
              color: COLORS.white
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                {partsModalTitle}
              </span>

              <button
                onClick={() => {
                  setPartsModalOpen(false);
                  focusPartsScanForBarcode();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.white,
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              minHeight: 0,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box'
            }}>
              {partsModalItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    hidePdaKeyboard();
                    setSelectedArrival(item);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: selectedArrival?.id === item.id
                      ? `2px solid ${COLORS.primary}`
                      : `1.5px solid ${COLORS.border}`,
                    cursor: 'pointer',
                    backgroundColor: selectedArrival?.id === item.id ? '#FFF7ED' : '#FFF'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: COLORS.textMain,
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      입하번호: {item.id}
                    </span>

                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: COLORS.primary,
                      flexShrink: 0
                    }}>
                      미입고량: {item.qty} EA
                    </span>
                  </div>

                  <div style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: COLORS.darkBg,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    품명: {item.name}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '12px',
              borderTop: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.white,
              boxSizing: 'border-box'
            }}>
              <button
                onClick={() => {
                  if (!selectedArrival) {
                    hidePdaKeyboard();
                    setErrorMsg('입하목록을 선택해주세요.');
                    return;
                  }

                  hidePdaKeyboard();

                  setPartsInputQty(selectedArrival.qty);
                  setPartsInputScan(selectedArrival.code);
                  setPartsListOpen(false);
                  setPartsModalOpen(false);

                  setPartsLocation('');
                  setPartsWarehouse('');
                  setPartsErrorTarget('location');

                  setTimeout(() => {
                    focusPartsLocationForBarcode();
                  }, 100);
                }}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* [모달 4] 생산투입 하위 자재 변경 모달 */}
        {/* ========================================== */}
        {prodSubModalOpen && selectedWo && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: COLORS.white,
              zIndex: 110,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: COLORS.darkBg,
                color: COLORS.white
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                하위부품 선택
              </span>

              <button
                onClick={() => {
                  setProdModalOpenPartCode(null);
                  setProdModalOpenPartName(null);
                  setProdModalOpenLocation(null);
                  setProdSubModalOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.white,
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#FFFFFF'
              }}
            >
              {selectedWo.subParts.slice(0, prodModalVisibleCount).map((sub) => (
                <div
                  key={sub.code}
                  onClick={() => {
                    hidePdaKeyboard();
                    setPendingSubPart(sub);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border:
                      pendingSubPart?.code === sub.code
                        ? `2px solid ${COLORS.primary}`
                        : `1.5px solid ${COLORS.border}`,
                    cursor: 'pointer',
                    backgroundColor:
                      pendingSubPart?.code === sub.code ? '#FFF7ED' : '#FFF'
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: COLORS.darkBg,
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px'
                      }}
                    >
                      <div
                        ref={(el) => checkProdOverflow(`${sub.code}-code`, el)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color: COLORS.darkBg,
                          whiteSpace: prodModalOpenPartCode === sub.code ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.35'
                        }}
                      >
                        품번: {sub.code}
                      </div>

                      {(prodOverflowMap[`${sub.code}-code`] || prodModalOpenPartCode === sub.code) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProdModalOpenPartCode(
                              prodModalOpenPartCode === sub.code ? null : sub.code
                            );
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            border: 'none',
                            background: 'transparent',
                            color: COLORS.primary,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {prodModalOpenPartCode === sub.code ? <SvgChevronUp /> : <SvgChevronDown />}
                        </button>
                      )}
                    </div>

                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: COLORS.darkBg,
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px'
                      }}
                    >
                      <div
                        ref={(el) => checkProdOverflow(`${sub.code}-name`, el)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color: COLORS.darkBg,
                          whiteSpace: prodModalOpenPartName === sub.code ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.35'
                        }}
                      >
                        품명: {sub.name}
                      </div>

                      {(prodOverflowMap[`${sub.code}-name`] || prodModalOpenPartName === sub.code) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProdModalOpenPartName(
                              prodModalOpenPartName === sub.code ? null : sub.code
                            );
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            border: 'none',
                            background: 'transparent',
                            color: COLORS.primary,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {prodModalOpenPartName === sub.code ? <SvgChevronUp /> : <SvgChevronDown />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: COLORS.textMain,
                      marginBottom: '4px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px'
                      }}
                    >
                      <div
                        ref={(el) => checkProdOverflow(`${sub.code}-location`, el)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: COLORS.textMain,
                          whiteSpace: prodModalOpenLocation === sub.code ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.35'
                        }}
                      >
                        위치: {sub.location}
                      </div>

                      {(prodOverflowMap[`${sub.code}-location`] || prodModalOpenLocation === sub.code) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProdModalOpenLocation(
                              prodModalOpenLocation === sub.code ? null : sub.code
                            );
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            border: 'none',
                            background: 'transparent',
                            color: COLORS.primary,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {prodModalOpenLocation === sub.code ? <SvgChevronUp /> : <SvgChevronDown />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: `1px dashed ${COLORS.border}`,
                      paddingTop: '8px',
                      marginTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    <span style={{ color: COLORS.primary }}>
                      작업지시번호: {selectedWo.woNumber}
                    </span>

                    <span style={{ color: COLORS.primary }}>
                      재고: {sub.stock} EA
                    </span>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  hidePdaKeyboard();
                  setProdModalVisibleCount((prev) => prev + 3);
                }}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: '#FFFFFF',
                  color: COLORS.darkBg,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                + 더보기
              </button>
            </div>
  
            <div
              style={{
                padding: '12px',
                borderTop: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white
              }}
            >
              <button
                onClick={() => {
                  if (!pendingSubPart) {
                    hidePdaKeyboard();
                    setErrorMsg('하위부품을 선택해주세요.');
                    return;
                  }

                  hidePdaKeyboard();

                  setSelectedSubPart(pendingSubPart);
                  setProdQty(pendingSubPart.required);
                  setProdAccordionOpen(false);

                  setProdModalOpenPartCode(null);
                  setProdModalOpenPartName(null);
                  setProdModalOpenLocation(null);

                  setProdSubModalOpen(false);

                  setTimeout(() => {
                    prodWoInputRef.current?.focus();
                    prodWoInputRef.current?.select();
                  }, 100);
                }}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* [모달 5] 출고 대상 수동 리스트 변경 모달 */}
        {/* ========================================== */}
        {outListModalOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: COLORS.white,
              zIndex: 110,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: COLORS.darkBg,
                color: COLORS.white
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                위치별 출고 목록
              </span>

              <button
                onClick={() => {
                  setOutListModalOpen(false);
                  setPendingOutItem(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.white,
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#FFFFFF'
              }}
            >
              {SHIPMENT_PARTS_MOCK.map((item) => (
                <div
                  key={item.code}
                  onClick={() => {
                    hidePdaKeyboard();
                    setPendingOutItem(item);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border:
                      pendingOutItem?.code === item.code
                        ? `2px solid ${COLORS.primary}`
                        : `1.5px solid ${COLORS.border}`,
                    backgroundColor:
                      pendingOutItem?.code === item.code ? '#FFF7ED' : '#FFF',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '6px'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg,
                        whiteSpace: outModalOpenCode === item.code ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.35'
                      }}
                    >
                      품번: {item.code}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOutModalOpenCode(
                          outModalOpenCode === item.code ? null : item.code
                        );
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        background: 'transparent',
                        color: COLORS.primary,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {outModalOpenCode === item.code ? <SvgChevronUp /> : <SvgChevronDown />}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg,
                        whiteSpace: outModalOpenName === item.code ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.35'
                      }}
                    >
                      품명: {item.name}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOutModalOpenName(
                          outModalOpenName === item.code ? null : item.code
                        );
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        background: 'transparent',
                        color: COLORS.primary,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {outModalOpenName === item.code ? <SvgChevronUp /> : <SvgChevronDown />}
                    </button>
                  </div>

                  <div
                    style={{
                      borderTop: `1px dashed ${COLORS.border}`,
                      paddingTop: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: COLORS.primary,
                      textAlign: 'left'
                    }}
                  >
                    재고: {item.qty} EA
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '12px',
                borderTop: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white
              }}
            >
              <button
                onClick={() => {
                  if (!pendingOutItem) {
                    hidePdaKeyboard();
                    setErrorMsg('출고할 품목을 선택해주세요.');
                    return;
                  }

                  hidePdaKeyboard();

                  setSelectedOutItem(pendingOutItem);
                  setOutQty(pendingOutItem.qty);
                  setOutAccordionOpen(false);

                  setOutModalOpenCode(null);
                  setOutModalOpenName(null);
                  setOutListModalOpen(false);

                  setTimeout(() => {
                    outLocRef.current?.focus();
                    outLocRef.current?.select();
                  }, 200);
                }}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* [모달 6] 재고이동 및 실사 수동 품목 조회 */}
        {/* ========================================== */}
        {((transListModalOpen && currentPage === 'TRANS') || (inspectListModalOpen && currentPage === 'INSPECT')) && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: COLORS.white,
              zIndex: 110,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: COLORS.darkBg,
                color: COLORS.white
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                {currentPage === 'TRANS' ? '이동 대상 선택' : '실사 대상 선택'}
              </span>

              <button
                onClick={() => {
                  setTransListModalOpen(false);
                  setInspectListModalOpen(false);
                  setPendingTransPart(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.white,
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#FFFFFF'
              }}
            >
              {LOCATION_STOCK_PARTS_MOCK.map((item) => (
                <div
                  key={item.code}
                  onClick={() => {
                    hidePdaKeyboard();

                    if (currentPage === 'TRANS') {
                      setPendingTransPart(item);
                      return;
                    }

                    setInspectSelectedPart(item);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border:
                      pendingTransPart?.code === item.code
                        ? `2px solid ${COLORS.primary}`
                        : `1.5px solid ${COLORS.border}`,
                    backgroundColor:
                      pendingTransPart?.code === item.code ? '#FFF7ED' : '#FFF',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '6px'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg,
                        whiteSpace: transModalOpenCode === item.code ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.35'
                      }}
                    >
                      품번: {item.code}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransModalOpenCode(
                          transModalOpenCode === item.code ? null : item.code
                        );
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        background: 'transparent',
                        color: COLORS.primary,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {transModalOpenCode === item.code ? <SvgChevronUp /> : <SvgChevronDown />}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: COLORS.darkBg,
                        whiteSpace: transModalOpenName === item.code ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.35'
                      }}
                    >
                      품명: {item.name}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransModalOpenName(
                          transModalOpenName === item.code ? null : item.code
                        );
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        background: 'transparent',
                        color: COLORS.primary,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {transModalOpenName === item.code ? <SvgChevronUp /> : <SvgChevronDown />}
                    </button>
                  </div>

                  <div
                    style={{
                      borderTop: `1px dashed ${COLORS.border}`,
                      paddingTop: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: COLORS.primary,
                      textAlign: 'left'
                    }}
                  >
                    재고: {item.qty} EA
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '12px',
                borderTop: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white
              }}
            >
              <button
                onClick={() => {
                  if (currentPage === 'TRANS') {
                    if (!pendingTransPart) {
                      hidePdaKeyboard();
                      setErrorMsg('이동할 품목을 선택해주세요.');
                      return;
                    }

                    hidePdaKeyboard();

                    setTransSelectedPart(pendingTransPart);
                    setTransQty(pendingTransPart.qty);
                    setTransAccordionOpen(false);

                    setTransModalOpenCode(null);
                    setTransModalOpenName(null);
                    setTransListModalOpen(false);

                    setTimeout(() => {
                      setTransToLocInputMode('none');
                      transToLocRef.current?.focus();
                      transToLocRef.current?.select();
                    }, 200);

                    return;
                  }

                  if (!inspectSelectedPart) {
                    hidePdaKeyboard();
                    setErrorMsg('실사할 품목을 선택해주세요.');
                    return;
                  }

                  setInspectQty(inspectSelectedPart.qty);
                  setInspectAccordionOpen(false);
                  setInspectListModalOpen(false);
                }}
                style={{
                  width: '100%',
                  height: '52px',
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* [공통 전역 인터랙션 피드백 시스템] */}
        {/* ========================================== */}

        {/* 1. 전체 블러 처리형 가상 로딩 상태 (Spinner) */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(255,255,255,0.4)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: `4px solid ${COLORS.primary}`,
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <span style={{ marginTop: '12px', fontSize: '14px', fontWeight: 'bold', color: COLORS.darkBg }}>
              데이터 전송 처리 중...
            </span>
          </div>
        )}

        {/* 2. 에러 팝업 (개선안 PPT 스타일의 다크 바텀 시트 형태 알림창 구현) */}
        {errorMsg && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px'
          }}>
            <div style={{
              width: '100%',
              backgroundColor: COLORS.errorBg,
              borderRadius: '16px',
              padding: '28px 20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              textAlign: 'center',
              boxSizing: 'border-box',
              color: COLORS.white
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(242, 114, 28, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '32px',
                color: COLORS.primary
              }}>
                ⚠️
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0' }}>오류 발생</h4>
              <p style={{ fontSize: '13px', color: '#A0AEC0', whiteSpace: 'pre-line', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                {errorMsg}
              </p>
              <button 
                onClick={() => {
                  setErrorMsg(null)

                  if (currentPage === 'PARTS_IN') {
                    if (partsErrorTarget === 'location') {
                      focusPartsLocationForBarcode();
                      return;
                    }

                    focusPartsScanForBarcode();
                    return;
                  }

                  if (currentPage === 'finished_IN') {
                    setTimeout(() => {
                      if (goodsErrorTarget === 'location') {
                        goodsLocationRef.current?.focus();
                        goodsLocationRef.current?.select();
                        return;
                      }

                      goodsInputRef.current?.focus();
                      goodsInputRef.current?.select();
                    }, 100);

                    return;
                  }

                  if (currentPage === 'PROD_INPUT') {
                    if (prodErrorTarget === 'location') {
                      focusProdLocationForBarcode();
                      return;
                    }

                    focusProdWoForBarcode();
                  }

                  if (currentPage === 'OUT') {
                    setErrorMsg(null);

                    setTimeout(() => {
                      outLocRef.current?.focus();
                      outLocRef.current?.select();
                    }, 150);

                    return;
                  }
                }}
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  border: 'none',
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 3. Confirm 팝업 */}
        {confirmMsg && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px'
          }}>
            <div style={{
              width: '100%',
              backgroundColor: COLORS.white,
              borderRadius: '16px',
              padding: '24px 20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              <h4 style={{ fontSize: '17px', fontWeight: 'bold', color: COLORS.darkBg, margin: '0 0 12px 0' }}>확인</h4>
              <p style={{ fontSize: '14px', color: COLORS.textMuted, margin: '0 0 24px 0' }}>{confirmMsg.text}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setConfirmMsg(null)}
                  style={{
                    flex: 1,
                    height: '46px',
                    backgroundColor: COLORS.lightBg,
                    color: COLORS.textMain,
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button 
                  onClick={confirmMsg.onConfirm}
                  style={{
                    flex: 1,
                    height: '46px',
                    backgroundColor: COLORS.primary,
                    color: COLORS.white,
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. 등록 완료 안내 팝업 */}
        {successMsg && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px'
          }}>
            <div style={{
              width: '100%',
              backgroundColor: COLORS.white,
              borderRadius: '16px',
              padding: '24px 20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#D1FAE5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                fontSize: '24px'
              }}>
                ✓
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.darkBg, margin: '0 0 16px 0' }}>완료</h4>
              <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: '0 0 20px 0' }}>{successMsg}</p>
              <button 
                onClick={() => setSuccessMsg(null)}
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                확인
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}