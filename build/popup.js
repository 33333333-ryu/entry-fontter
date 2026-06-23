chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0].url;

    if (currentTab.includes("playentry.org/ws")) {
        document.getElementById('ws').style.display = 'block';
        document.getElementById('project').style.display = 'none';

        function applyfont(fontlink, fontname) {
            try {
                const target = document.head || document.documentElement;
                if (target) {
                    const style = document.createElement('style');
                    style.textContent = fontlink;
                    target.appendChild(style);
                }

                if (typeof window.Entry !== 'undefined' && window.Entry.playground) {
                    const object = window.Entry.playground.object;
                    if (!object) return { success: false, reason: 'noObject', isMain: true };

                    if (object.objectType !== 'textBox') {
                        return { success: false, reason: 'notTextBox', isMain: true };
                    }

                    window.Entry.playground.object.entity.setFontType(fontname);
                    return { success: true, isMain: true };
                }

                return { success: true, isMain: false };
            } catch (error) {
                return { success: false, reason: 'exception', message: String(error) };
            }
        }

        const errorMessage   = document.getElementById('ws-errorBox');
        const applyButton    = document.getElementById('ws-applyfont');
        const webfontDirInput  = document.getElementById('ws-webfontdir');
        const webfontNameInput = document.getElementById('ws-webfontname');

        applyButton.addEventListener('click', async function () {
            const fontDirValue  = webfontDirInput.value.trim();
            const fontNameValue = webfontNameInput.value.trim();

            if (!fontDirValue || !fontNameValue) {
                errorMessage.textContent = '웹폰트 주소와 이름을 모두 입력하세요.';
                errorMessage.style.display = 'block';
                return;
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || typeof tab.id !== 'number') {
                errorMessage.textContent = '활성 탭을 찾을 수 없습니다.';
                errorMessage.style.display = 'block';
                return;
            }

            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true }, 
                    func: applyfont,
                    args: [fontDirValue, fontNameValue],
                    world: 'MAIN'
                });
                const mainResultObj = results?.find(r => r.result && r.result.isMain);
                const result = mainResultObj ? mainResultObj.result : results?.[0]?.result;

                if (result?.success) {
                    errorMessage.style.display = 'none';
                } else {
                    errorMessage.textContent =
                        result?.reason === 'notTextBox'
                            ? '현재 선택된 오브젝트가 글상자가 아닙니다'
                            : '웹폰트 적용에 실패했습니다.';
                    errorMessage.style.display = 'block';
                    console.error('Entry-Fontter:', result);
                }
            } catch (error) {
                errorMessage.textContent = '스크립트 실행 중 오류가 발생했습니다.';
                errorMessage.style.display = 'block';
                console.error('Entry-Fontter:', error);
            }
        });

    } else {
        document.getElementById('ws').style.display = 'none';
        document.getElementById('project').style.display = 'block';

        const errorMessage   = document.getElementById('project-errorBox');
        const applyButton    = document.getElementById('project-applyfont');
        const webfontDirInput = document.getElementById('project-webfontdir');
        const savedFontsList  = document.getElementById('saved-fonts-list');
        const clearAllBtn     = document.getElementById('clear-all-btn');

        // 입력된 CSS/URL 텍스트에서 폰트 이름을 추출하는 함수
        function getFontNameFromCSS(css) {
            // 1. @font-face 내의 font-family 속성 추출 시도
            const fontFamilyMatch = css.match(/font-family\s*:\s*['"]?([^'"]+?)['"]?\s*[;}]/i);
            if (fontFamilyMatch && fontFamilyMatch[1]) {
                return fontFamilyMatch[1].trim();
            }
            
            // 2. Google Fonts 등의 @import 주소에서 family 매개변수 추출 시도
            const googleFontMatch = css.match(/family=([^&:#;)]+)/i);
            if (googleFontMatch && googleFontMatch[1]) {
                const name = googleFontMatch[1].split(':')[0];
                return decodeURIComponent(name.replace(/\+/g, ' ')).trim();
            }
            
            // 3. 일반 웹 주소 형태일 경우 파일명에서 이름 유추
            const urlMatch = css.match(/url\(['"]?([^'"]+?)['"]?\)/i);
            const targetString = urlMatch ? urlMatch[1] : css;
            if (targetString.includes('/')) {
                const parts = targetString.split('/');
                const fileName = parts[parts.length - 1];
                if (fileName && fileName.includes('.')) {
                    return fileName.split('.')[0].trim();
                }
            }
            
            // 4. 추출 실패 시 글자 수 제한 후 원본 반환
            return css.length > 25 ? css.substring(0, 22) + '...' : css;
        }

        function renderSavedFonts(fonts) {
            savedFontsList.innerHTML = '';

            if (!fonts || fonts.length === 0) {
                clearAllBtn.style.display = 'none';
                return;
            }

            clearAllBtn.style.display = 'inline-block';

            fonts.forEach(function (css, index) {
                const item = document.createElement('div');
                item.className = 'font-item';

                const contentContainer = document.createElement('div');
                contentContainer.className = 'font-item-content';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'font-item-name';
                nameSpan.textContent = getFontNameFromCSS(css);

                const preview = document.createElement('span');
                preview.className = 'font-item-css';
                preview.textContent = css;
                preview.title = css;

                contentContainer.appendChild(nameSpan);
                contentContainer.appendChild(preview);

                const delBtn = document.createElement('button');
                delBtn.className = 'font-delete-btn';
                delBtn.textContent = '삭제';
                delBtn.addEventListener('click', function () {
                    deleteSavedFont(index);
                });

                item.appendChild(contentContainer);
                item.appendChild(delBtn);
                savedFontsList.appendChild(item);
            });
        }

        function deleteSavedFont(index) {
            chrome.storage.local.get('projectFonts', function (data) {
                const fonts = data.projectFonts || [];
                fonts.splice(index, 1);

                chrome.storage.local.set({ projectFonts: fonts }, function () {
                    renderSavedFonts(fonts);
                });
            });
        }

        clearAllBtn.addEventListener('click', function () {
            chrome.storage.local.set({ projectFonts: [] }, function () {
                renderSavedFonts([]);
            });
        });

        chrome.storage.local.get('projectFonts', function (data) {
            renderSavedFonts(data.projectFonts || []);
        });

        function applyfontproject(lines) {
            lines.forEach(function (line) {
                if (!line.trim()) return;

                const style = document.createElement('style');
                style.setAttribute('data-entry-fontter', 'true');
                style.textContent = line;

                const target = document.head || document.documentElement;
                if (target) {
                    target.appendChild(style);
                    console.log(
                        '%cEntry-Fontter%c 폰트 적용 성공: ' + line,
                        'font-weight: bold; font-size: 13px;', ''
                    );
                } else {
                    console.error(
                        '%cEntry-Fontter%c 폰트 적용 실패: ' + line,
                        'font-weight: bold; font-size: 13px;', ''
                    );
                }
            });
        }

        applyButton.addEventListener('click', async function () {
            const inputValue = webfontDirInput.value.trim();

            if (!inputValue) {
                errorMessage.textContent = '웹폰트 주소를 입력하세요.';
                errorMessage.style.display = 'block';
                return;
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || typeof tab.id !== 'number') {
                errorMessage.textContent = '활성 탭을 찾을 수 없습니다.';
                errorMessage.style.display = 'block';
                return;
            }

            const newLines = inputValue.split('\n').filter(l => l.trim());

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    func: applyfontproject,
                    args: [newLines],
                    world: 'MAIN'
                });
            } catch (error) {
                errorMessage.textContent = '스크립트 실행 중 오류가 발생했습니다.';
                errorMessage.style.display = 'block';
                console.error('Entry-Fontter:', error);
                return;
            }

            chrome.storage.local.get('projectFonts', function (data) {
                const existing = data.projectFonts || [];
                const merged = existing.slice();
                newLines.forEach(function (line) {
                    if (!merged.includes(line)) {
                        merged.push(line);
                    }
                });

                chrome.storage.local.set({ projectFonts: merged }, function () {
                    webfontDirInput.value = ''; 
                    errorMessage.style.display = 'none';
                    renderSavedFonts(merged);
                });
            });
        });
    }
});