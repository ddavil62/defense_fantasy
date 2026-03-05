/**
 * @fileoverview 메인 메뉴 씬(MenuScene).
 * 게임 타이틀, 최고 기록, 다이아몬드 보유량을 표시하고
 * CAMPAIGN / ENDLESS(잠금) / COLLECTION / STATISTICS 버튼과 음소거 토글을 제공한다.
 *
 * 다크 판타지 테마: 골드 룬 라인, 별자리 장식, 타이틀 글로우,
 * 시맨틱 버튼 컬러, 퍼플 다이아몬드 표시.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS,
  BTN_PRIMARY, BTN_META, BTN_BACK, BTN_SELL, BTN_DANGER,
  BTN_META_CSS, BTN_BACK_CSS, BTN_SELL_CSS, BTN_DANGER_CSS,
  AD_REWARD_DIAMOND, AD_LIMIT_DIAMOND, ADMOB_REWARDED_DIAMOND_ID, SAVE_KEY,
} from '../config.js';
import { CLASSIC_MAP } from '../data/maps.js';
import { t, setLocale, getLocale, SUPPORTED_LOCALES } from '../i18n.js';

/**
 * 타이틀 화면 씬.
 * 게임 시작, 컬렉션, 통계 진입, BGM 재생 및 음소거 토글을 담당한다.
 * @extends Phaser.Scene
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  /**
   * 메뉴 UI 요소를 생성한다.
   * 배경, 별자리 장식, 타이틀, 다이아몬드/기록 표시, 버튼, 음소거 토글 순서로 배치한다.
   */
  create() {
    const centerX = GAME_WIDTH / 2;

    // ── 배경 ──
    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // ── 별자리 장식: 랜덤 위치에 흰색 점(별) 30~40개 ──
    const starGfx = this.add.graphics();
    const starCount = 30 + Math.floor(Math.random() * 11);
    for (let i = 0; i < starCount; i++) {
      const sx = Math.random() * GAME_WIDTH;
      const sy = Math.random() * GAME_HEIGHT;
      const sa = 0.2 + Math.random() * 0.3;   // 투명도 0.2~0.5
      const sr = 0.5 + Math.random() * 1.0;   // 반지름 0.5~1.5px
      starGfx.fillStyle(0xffffff, sa);
      starGfx.fillCircle(sx, sy, sr);
    }

    // ── 상/하단 장식용 골드 룬 라인 (alpha 0.6) ──
    this.add.rectangle(centerX, 30, GAME_WIDTH - 40, 2, 0xc0a030).setAlpha(0.6);
    this.add.rectangle(centerX, GAME_HEIGHT - 30, GAME_WIDTH - 40, 2, 0xc0a030).setAlpha(0.6);

    // ── 레이아웃 오프셋 (콘텐츠 상단 여백 조정) ──
    const offsetY = -100;

    // ── 타이틀 텍스트 (골드 + 그림자 글로우) ──
    this.add.text(centerX, 190 + offsetY, 'Fantasy\nTower Defense', {
      fontSize: '28px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      align: 'center',
      fontStyle: 'bold',
      lineSpacing: 8,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#c0a030',
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5);

    // ── 다이아몬드 보유량 (퍼플) ──
    const saveData = this.registry.get('saveData');
    const diamond = saveData?.diamond || 0;
    /** @type {Phaser.GameObjects.Text} 다이아몬드 보유량 텍스트 (광고 보상 후 갱신용) */
    this._diamondText = this.add.text(centerX, 280 + offsetY, `\u25C6 ${diamond}`, {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
      align: 'center',
    }).setOrigin(0.5);

    // ── "Diamond 받기" 광고 버튼 ──
    this._createDiamondAdButton(centerX, 312 + offsetY);

    // ── 최고 기록 표시 (Diamond 버튼 아래) ──
    if (saveData && saveData.bestRound > 0) {
      this.add.text(centerX, 348 + offsetY, t('menu.best').replace('{round}', saveData.bestRound), {
        fontSize: '18px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(centerX, 369 + offsetY, t('menu.record').replace('{kills}', saveData.bestKills).replace('{games}', saveData.totalGames), {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#b2bec3',
        align: 'center',
      }).setOrigin(0.5);
    }

    // ── CAMPAIGN 버튼 (골드 프라이머리, 대형 160x44) ──
    const campaignBg = this._createImageButton(
      centerX, 400 + offsetY, 'btn_large_primary',
      160, 44, BTN_PRIMARY, 0xffd700
    );

    this.add.text(centerX, 400 + offsetY, t('ui.campaign'), {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    campaignBg.on('pointerdown', () => {
      // 광고 진행 중이면 씬 전환 차단
      const adManager = this.registry.get('adManager');
      if (adManager?.isBusy) return;
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldSelectScene');
      });
    });

    // ── ENDLESS 버튼 (캠페인 전체 클리어 시 해금) ──
    const endlessUnlocked = this._isEndlessUnlocked(saveData);

    if (endlessUnlocked) {
      // 활성 상태: 골드 프라이머리 버튼 (대형 160x44로 표준화)
      const endlessBg = this._createImageButton(
        centerX, 455 + offsetY, 'btn_large_primary',
        160, 44, BTN_PRIMARY, 0xffd700
      );

      this.add.text(centerX, 455 + offsetY, t('ui.endless'), {
        fontSize: '15px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      endlessBg.on('pointerdown', () => {
        // 광고 진행 중이면 씬 전환 차단
        const adManager = this.registry.get('adManager');
        if (adManager?.isBusy) return;
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('EndlessMapSelectScene');
        });
      });
    } else {
      // 비활성 상태: 회색 잠금 버튼 (대형 disabled)
      this._createImageButton(
        centerX, 455 + offsetY, 'btn_large_disabled',
        160, 44, BTN_SELL, 0x636e72, true
      );

      this.add.text(centerX, 455 + offsetY, t('ui.endless'), {
        fontSize: '15px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // ENDLESS 하단 잠금 안내 텍스트
      this.add.text(centerX, 480 + offsetY, t('ui.endlessLocked'), {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
    }

    // ── COLLECTION 버튼 (퍼플 메타, 대형 160x44로 표준화) ──
    const collBg = this._createImageButton(
      centerX, 512 + offsetY, 'btn_large_meta',
      160, 44, BTN_META, COLORS.DIAMOND
    );

    this.add.text(centerX, 512 + offsetY, t('menu.collection'), {
      fontSize: '15px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    collBg.on('pointerdown', () => {
      // 광고 진행 중이면 씬 전환 차단
      const adManager = this.registry.get('adManager');
      if (adManager?.isBusy) return;
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CollectionScene');
      });
    });

    // ── STATISTICS 버튼 (틸 백, 대형 160x44로 표준화) ──
    const statsBg = this._createImageButton(
      centerX, 564 + offsetY, 'btn_large_back',
      160, 44, BTN_BACK, 0x1a9c7e
    );

    this.add.text(centerX, 564 + offsetY, t('menu.statistics'), {
      fontSize: '15px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    statsBg.on('pointerdown', () => {
      // 광고 진행 중이면 씬 전환 차단
      const adManager = this.registry.get('adManager');
      if (adManager?.isBusy) return;
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('StatsScene');
      });
    });

    // ── 광고제거 구매 버튼 (STATISTICS 아래, 음소거/언어 위) ──
    this._createRemoveAdsButton(centerX, 610 + offsetY);

    // ── 음소거 토글 버튼 (소형 80x26, 좌측 배치) ──
    /** @type {import('../managers/SoundManager.js').SoundManager|null} */
    const sm = this.registry.get('soundManager');
    if (sm) {
      const isMuted = sm.muted;
      const muteTexKey = isMuted ? 'btn_small_disabled' : 'btn_small_back_normal';
      const muteBg = this._createImageButton(
        centerX - 48, 650 + offsetY, isMuted ? 'btn_small_disabled' : 'btn_small_back',
        80, 26, isMuted ? BTN_SELL : BTN_BACK, isMuted ? 0x636e72 : 0x1a9c7e,
        false
      );

      const muteLabel = this.add.text(centerX - 48, 650 + offsetY,
        isMuted ? '\u266A OFF' : '\u266A ON',
        {
          fontSize: '13px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#ffffff',
          fontStyle: 'bold',
        }
      ).setOrigin(0.5);

      muteBg.on('pointerdown', () => {
        sm.setMuted(!sm.muted);
        const m = sm.muted;
        muteLabel.setText(m ? '\u266A OFF' : '\u266A ON');
        muteLabel.setColor('#ffffff');
        // 음소거 상태에 따라 텍스처 전환
        if (this.textures.exists('btn_small_disabled') && this.textures.exists('btn_small_back_normal')) {
          muteBg.setTexture(m ? 'btn_small_disabled' : 'btn_small_back_normal');
        } else {
          muteBg.setFillStyle(m ? BTN_SELL : BTN_BACK);
          muteBg.setStrokeStyle(1, m ? 0x636e72 : 0x1a9c7e);
        }
      });

      // 메뉴 BGM 재생
      sm.playBgm('menu');
    }

    // ── 언어 전환 버튼 (소형 80x26, 우측 배치) ──
    const curLocale = getLocale();
    /** @type {Object<string, string>} 로케일별 버튼 레이블 */
    const localeLabels = { ko: '한국어', en: 'English' };
    const langBg = this._createImageButton(
      centerX + 48, 650 + offsetY, 'btn_small_back',
      80, 26, BTN_BACK, 0x1a9c7e,
      false
    );

    this.add.text(centerX + 48, 650 + offsetY,
      localeLabels[curLocale] || curLocale,
      {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    langBg.on('pointerdown', () => {
      const cur = getLocale();
      const idx = SUPPORTED_LOCALES.indexOf(cur);
      const next = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length];
      setLocale(next);
      // 씬 재시작으로 전체 텍스트 갱신
      this.scene.restart();
    });
  }

  // ── Diamond 광고 버튼 ────────────────────────────────────────

  /**
   * "Diamond 받기" 보상형 광고 버튼을 생성한다.
   * 일일 제한 횟수와 잔여 횟수를 표시하고, 소진 시 비활성화한다.
   * 광고 시청 완료 시 Diamond를 즉시 지급하고 화면을 갱신한다.
   * @param {number} x - 버튼 중심 X
   * @param {number} y - 버튼 중심 Y
   * @private
   */
  _createDiamondAdButton(x, y) {
    /** @type {import('../managers/AdManager.js').AdManager|null} */
    const adManager = this.registry.get('adManager');
    const isAdFree = adManager ? adManager.isAdFree() : false;
    const remaining = adManager ? adManager.getRemainingAdCount('diamond') : 0;
    const isLimitReached = adManager ? adManager.isAdLimitReached('diamond') : true;

    // adFree 상태면 무제한 표시
    const countDisplay = isAdFree ? '\u221E' : `${remaining}/${AD_LIMIT_DIAMOND}`;

    // 버튼 텍스트: "Diamond 받기 (N/5)" 또는 "오늘 한도 초과"
    const btnText = isLimitReached
      ? t('ui.ad.limitReached')
      : `${t('ui.ad.diamond')} (${countDisplay})`;

    if (isLimitReached) {
      // 비활성 상태: 회색 소형 버튼
      this._createImageButton(
        x, y, 'btn_small_disabled', 140, 26, BTN_SELL, 0x636e72, true
      );

      this.add.text(x, y, btnText, {
        fontSize: '11px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      return;
    }

    // 활성 상태: 퍼플 메타 소형 버튼
    const btnBg = this._createImageButton(
      x, y, 'btn_small_meta', 140, 26, BTN_META, COLORS.DIAMOND
    );

    const label = this.add.text(x, y, btnText, {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    /** @type {Phaser.GameObjects.Text|null} 광고 실패 안내 텍스트 */
    let failText = null;

    /** @type {boolean} 버튼 처리 중 여부 (중복 탭 방지) */
    let isProcessing = false;

    btnBg.on('pointerdown', async () => {
      if (isProcessing) return;
      if (!adManager) return;
      if (adManager.isAdLimitReached('diamond')) return;

      isProcessing = true;

      // 실패 메시지가 있으면 제거
      if (failText) {
        failText.destroy();
        failText = null;
      }

      // 로딩 상태 표시
      label.setText(t('ui.ad.loading'));

      const result = await adManager.showRewarded(ADMOB_REWARDED_DIAMOND_ID);

      // 씬 전환 후 콜백 진입 방지
      if (!this.scene.isActive('MenuScene')) return;

      if (result.rewarded) {
        // Diamond 지급: saveData 갱신 + localStorage 저장
        const saveData = this.registry.get('saveData');
        if (saveData) {
          saveData.diamond = (saveData.diamond || 0) + AD_REWARD_DIAMOND;
          this.registry.set('saveData', saveData);
          try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
          } catch {
            // localStorage 저장 실패 시 무시
          }

          // 다이아몬드 표시 텍스트 갱신
          if (this._diamondText) {
            this._diamondText.setText(`\u25C6 ${saveData.diamond}`);
          }
        }

        // 일일 카운터 증가
        adManager.incrementDailyAdCount('diamond');

        // 잔여 횟수 갱신 또는 비활성화
        const newRemaining = adManager.getRemainingAdCount('diamond');
        const newAdFree = adManager.isAdFree();
        const newCountDisplay = newAdFree ? '\u221E' : `${newRemaining}/${AD_LIMIT_DIAMOND}`;
        if (adManager.isAdLimitReached('diamond')) {
          label.setText(t('ui.ad.limitReached'));
          label.setColor('#636e72');
          label.setStyle({ fontStyle: '' });
          // 버튼 비활성화: 인터랙티브 해제 + 색상 변경
          btnBg.disableInteractive();
          if (typeof btnBg.setFillStyle === 'function') {
            btnBg.setFillStyle(BTN_SELL);
            btnBg.setStrokeStyle(2, 0x636e72);
          } else if (typeof btnBg.setTint === 'function') {
            btnBg.setTint(0x636e72);
          }
        } else {
          label.setText(`${t('ui.ad.diamond')} (${newCountDisplay})`);
          isProcessing = false;
        }
      } else {
        // 광고 실패: 안내 메시지 표시, 버튼 재활성화
        const curRemaining = adManager.getRemainingAdCount('diamond');
        const curAdFree = adManager.isAdFree();
        const curCountDisplay = curAdFree ? '\u221E' : `${curRemaining}/${AD_LIMIT_DIAMOND}`;
        label.setText(`${t('ui.ad.diamond')} (${curCountDisplay})`);
        failText = this.add.text(x, y + 16, t('ui.ad.failed'), {
          fontSize: '10px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#e74c3c',
        }).setOrigin(0.5);
        isProcessing = false;
      }
    });
  }

  // ── 종료 확인 다이얼로그 ──────────────────────────────────────

  /**
   * 앱 종료 확인 다이얼로그를 표시한다.
   * Android 뒤로가기 키(ESC) 입력 시 호출된다.
   * 다이얼로그가 이미 열린 상태면 중복 생성하지 않는다.
   * @private
   */
  _openExitDialog() {
    if (window.__isExitDialogOpen) return;
    window.__isExitDialogOpen = true;

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // 다이얼로그 요소를 관리할 컨테이너
    const dialogContainer = this.add.container(0, 0).setDepth(100);

    /**
     * 다이얼로그를 닫고 플래그를 해제하는 헬퍼.
     */
    const closeDialog = () => {
      window.__isExitDialogOpen = false;
      dialogContainer.destroy();
    };

    // ── 반투명 오버레이 (뒤 요소 클릭 차단 + 외부 탭 시 닫기) ──
    const overlay = this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    overlay.on('pointerdown', closeDialog);
    dialogContainer.add(overlay);

    // ── 다이얼로그 패널 (다크 배경 + 골드 테두리) ──
    const panelW = 240;
    const panelH = 140;
    const panel = this.add.rectangle(centerX, centerY, panelW, panelH, 0x05050f)
      .setStrokeStyle(2, 0xc0a030)
      .setInteractive(); // 패널 클릭이 오버레이까지 전파되지 않도록 차단
    dialogContainer.add(panel);

    // ── "게임을 종료하시겠습니까?" 텍스트 ──
    const confirmText = this.add.text(centerX, centerY - 30, t('ui.exitConfirm'), {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: panelW - 32 },
    }).setOrigin(0.5);
    dialogContainer.add(confirmText);

    // ── 확인 버튼 (위험 레드) ──
    const btnW = 90;
    const btnH = 34;
    const btnY = centerY + 30;
    const yesBg = this._createImageButton(
      centerX - 58, btnY, 'btn_small_danger', btnW, btnH, BTN_DANGER, 0x636e72
    );
    yesBg.setDepth(101);
    dialogContainer.add(yesBg);

    const yesText = this.add.text(centerX - 58, btnY, t('ui.exitConfirmYes'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);
    dialogContainer.add(yesText);

    yesBg.on('pointerdown', () => {
      window.__isExitDialogOpen = false;
      // 앱 종료 시도: navigator.app.exitApp() → window.close() 폴백
      if (navigator.app && typeof navigator.app.exitApp === 'function') {
        navigator.app.exitApp();
      } else {
        window.close();
      }
    });

    // ── 취소 버튼 (틸 백) ──
    const noBg = this._createImageButton(
      centerX + 58, btnY, 'btn_small_back', btnW, btnH, BTN_BACK, 0x1a9c7e
    );
    noBg.setDepth(101);
    dialogContainer.add(noBg);

    const noText = this.add.text(centerX + 58, btnY, t('ui.exitConfirmNo'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);
    dialogContainer.add(noText);

    noBg.on('pointerdown', closeDialog);
  }

  // ── 광고제거 구매 버튼 ──────────────────────────────────────

  /**
   * "광고 제거" 인앱 구매 버튼을 생성한다.
   * 구매 완료 시 비활성 상태 + "구매완료" 텍스트를 표시한다.
   * @param {number} x - 버튼 중심 X
   * @param {number} y - 버튼 중심 Y
   * @private
   */
  _createRemoveAdsButton(x, y) {
    const saveData = this.registry.get('saveData');
    const isPurchased = saveData?.adFree === true;

    if (isPurchased) {
      // 구매 완료 상태: 비활성 버튼 + "구매완료" 텍스트
      this._createImageButton(
        x, y, 'btn_medium_disabled', 160, 34, BTN_SELL, 0x636e72, true
      );

      this.add.text(x, y, t('iap.removeAds.purchased'), {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      return;
    }

    // 활성 상태: 위험 레드 버튼
    const btnBg = this._createImageButton(
      x, y, 'btn_medium_danger', 160, 34, BTN_DANGER, 0xc0392b
    );

    /** @type {Phaser.GameObjects.Text} 버튼 메인 라벨 */
    const mainLabel = this.add.text(x, y - 5, t('iap.removeAds'), {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    /** @type {Phaser.GameObjects.Text} 가격 서브라벨 */
    const priceLabel = this.add.text(x, y + 10, t('iap.removeAds.price'), {
      fontSize: '10px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffcccc',
    }).setOrigin(0.5);

    btnBg.on('pointerdown', () => {
      this._openPurchaseDialog(btnBg, mainLabel, priceLabel);
    });
  }

  // ── 광고제거 구매 확인 다이얼로그 ──────────────────────────────

  /**
   * 광고제거 구매 확인 다이얼로그를 표시한다.
   * _openExitDialog 패턴을 재사용한다.
   * @param {Phaser.GameObjects.Image|Phaser.GameObjects.Rectangle} btnBg - 원본 버튼 배경
   * @param {Phaser.GameObjects.Text} mainLabel - 원본 메인 라벨
   * @param {Phaser.GameObjects.Text} priceLabel - 원본 가격 라벨
   * @private
   */
  _openPurchaseDialog(btnBg, mainLabel, priceLabel) {
    if (window.__isPurchaseDialogOpen) return;
    window.__isPurchaseDialogOpen = true;

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // 다이얼로그 요소를 관리할 컨테이너
    const dialogContainer = this.add.container(0, 0).setDepth(100);

    /**
     * 다이얼로그를 닫고 플래그를 해제하는 헬퍼.
     */
    const closeDialog = () => {
      window.__isPurchaseDialogOpen = false;
      dialogContainer.destroy();
    };

    // ── 반투명 오버레이 (뒤 요소 클릭 차단 + 외부 탭 시 닫기) ──
    const overlay = this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    overlay.on('pointerdown', closeDialog);
    dialogContainer.add(overlay);

    // ── 다이얼로그 패널 (다크 배경 + 골드 테두리) ──
    const panelW = 260;
    const panelH = 180;
    const panel = this.add.rectangle(centerX, centerY, panelW, panelH, 0x05050f)
      .setStrokeStyle(2, 0xc0a030)
      .setInteractive(); // 패널 클릭이 오버레이까지 전파되지 않도록 차단
    dialogContainer.add(panel);

    // ── 확인 텍스트 ──
    const confirmText = this.add.text(centerX, centerY - 48, t('iap.removeAds.confirm'), {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: panelW - 32 },
    }).setOrigin(0.5);
    dialogContainer.add(confirmText);

    // ── 설명 텍스트 ──
    const descText = this.add.text(centerX, centerY - 12, t('iap.removeAds.confirmDesc'), {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    dialogContainer.add(descText);

    // ── 구매하기 버튼 (위험 레드) ──
    const btnW = 100;
    const btnH = 34;
    const btnY = centerY + 48;
    const yesBg = this._createImageButton(
      centerX - 58, btnY, 'btn_small_danger', btnW, btnH, BTN_DANGER, 0x636e72
    );
    yesBg.setDepth(101);
    dialogContainer.add(yesBg);

    const yesText = this.add.text(centerX - 58, btnY, t('iap.removeAds.confirmYes'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);
    dialogContainer.add(yesText);

    yesBg.on('pointerdown', async () => {
      // 버튼 비활성화 (중복 탭 방지)
      yesBg.disableInteractive();
      yesText.setText(t('ui.ad.loading'));

      const iapManager = this.registry.get('iapManager');
      if (!iapManager) {
        closeDialog();
        return;
      }

      const result = await iapManager.purchaseRemoveAds(this.registry);

      // 씬 전환 후 콜백 진입 방지
      if (!this.scene.isActive('MenuScene')) return;

      if (result.success) {
        closeDialog();

        // 원본 버튼을 "구매완료" 상태로 변경
        btnBg.disableInteractive();
        if (typeof btnBg.setFillStyle === 'function') {
          btnBg.setFillStyle(BTN_SELL);
          btnBg.setStrokeStyle(2, 0x636e72);
        } else if (typeof btnBg.setTint === 'function') {
          btnBg.setTint(0x636e72);
        }
        mainLabel.setText(t('iap.removeAds.purchased'));
        mainLabel.setColor('#636e72');
        mainLabel.setStyle({ fontStyle: '' });
        mainLabel.setY(mainLabel.y + 5); // 서브라벨 제거에 따른 Y 보정
        priceLabel.setVisible(false);

        // 성공 토스트 메시지
        const successToast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60,
          t('iap.removeAds.success'), {
            fontSize: '16px',
            fontFamily: 'Galmuri11, Arial, sans-serif',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
          }).setOrigin(0.5).setDepth(110);

        this.tweens.add({
          targets: successToast,
          y: successToast.y - 40,
          alpha: 0,
          duration: 2000,
          delay: 500,
          onComplete: () => { successToast.destroy(); },
        });

        // 다이아몬드 버튼 라벨을 무제한으로 갱신하기 위해 씬 재시작
        this.time.delayedCall(800, () => {
          if (this.scene.isActive('MenuScene')) {
            this.scene.restart();
          }
        });
      } else {
        // 실패 시 다이얼로그 닫고 에러 메시지 표시
        closeDialog();
        const failToast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60,
          t('iap.removeAds.failed'), {
            fontSize: '14px',
            fontFamily: 'Galmuri11, Arial, sans-serif',
            color: '#e74c3c',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
          }).setOrigin(0.5).setDepth(110);

        this.tweens.add({
          targets: failToast,
          y: failToast.y - 40,
          alpha: 0,
          duration: 2000,
          delay: 500,
          onComplete: () => { failToast.destroy(); },
        });
      }
    });

    // ── 취소 버튼 (틸 백) ──
    const noBg = this._createImageButton(
      centerX + 58, btnY, 'btn_small_back', btnW, btnH, BTN_BACK, 0x1a9c7e
    );
    noBg.setDepth(101);
    dialogContainer.add(noBg);

    const noText = this.add.text(centerX + 58, btnY, t('iap.removeAds.confirmNo'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);
    dialogContainer.add(noText);

    noBg.on('pointerdown', closeDialog);
  }

  // ── 이미지 버튼 생성 헬퍼 ────────────────────────────────────

  /**
   * 이미지 에셋이 존재하면 이미지 버튼을, 없으면 기존 rectangle 폴백을 생성한다.
   * pressed 상태의 텍스처 전환(pointerdown/up/out)도 자동 처리한다.
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @param {string} textureBase - 텍스처 기본 키 (e.g. 'btn_large_primary')
   * @param {number} w - 폴백 사각형 너비
   * @param {number} h - 폴백 사각형 높이
   * @param {number} fillColor - 폴백 사각형 채우기 색상
   * @param {number} strokeColor - 폴백 사각형 테두리 색상
   * @param {boolean} [isDisabled=false] - 비활성 버튼 여부 (인터랙티브 비설정)
   * @returns {Phaser.GameObjects.Image|Phaser.GameObjects.Rectangle} 생성된 버튼
   * @private
   */
  _createImageButton(x, y, textureBase, w, h, fillColor, strokeColor, isDisabled = false) {
    // disabled 텍스처는 '_normal'이 아닌 단일 키
    const isDisabledTexture = textureBase.endsWith('_disabled');
    const normalKey = isDisabledTexture ? textureBase : `${textureBase}_normal`;
    const pressedKey = isDisabledTexture ? textureBase : `${textureBase}_pressed`;

    if (this.textures.exists(normalKey)) {
      const btn = this.add.image(x, y, normalKey);
      if (!isDisabled) {
        btn.setInteractive({ useHandCursor: true });
        // pressed 상태 텍스처 전환
        if (this.textures.exists(pressedKey) && !isDisabledTexture) {
          btn.on('pointerdown', () => btn.setTexture(pressedKey));
          btn.on('pointerup', () => btn.setTexture(normalKey));
          btn.on('pointerout', () => btn.setTexture(normalKey));
        }
      }
      return btn;
    }

    // 이미지 폴백: 기존 rectangle 방식
    const rect = this.add.rectangle(x, y, w, h, fillColor)
      .setStrokeStyle(2, strokeColor);
    if (!isDisabled) {
      rect.setInteractive({ useHandCursor: true });
    }
    return rect;
  }

  // ── 엔드리스 해금 판정 ────────────────────────────────────────

  /**
   * 엔드리스 모드 해금 여부를 판정한다.
   * 세이브 데이터의 endlessUnlocked 플래그를 직접 확인한다.
   * (MapClearScene에서 30개 맵 전부 클리어 시 endlessUnlocked = true로 저장)
   * @param {object|null} saveData - 세이브 데이터
   * @returns {boolean} 해금 여부
   * @private
   */
  _isEndlessUnlocked(saveData) {
    return saveData?.endlessUnlocked === true;
  }
}
