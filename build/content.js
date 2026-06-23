(function () {
    function Applyfontproject(inputvalue) {
        const lines = inputvalue
            .split('\n')
            .map(function (line) {
                return line.trim();
            })
            .filter(function (line) {
                return line !== '';
            });

        lines.forEach(function (line) {
            const style = document.createElement('style');
            style.setAttribute('data-entry-fontter', 'true');
            style.textContent = line;

            const target = document.head || document.documentElement;
            if (target) {
                target.appendChild(style);
                console.log(
                    `%cEntry-Fontter%c 폰트 적용 성공: ${line}`,
                    'font-weight: bold; font-size: 13px;',
                    ''
                );
            } else {
                console.error(
                    `%cEntry-Fontter%c 폰트 적용 실패: ${line}`,
                    'font-weight: bold; font-size: 13px;',
                    ''
                );
            }
        });
    }

    chrome.storage.local.get('projectFonts', function (data) {
        const fonts = data.projectFonts;

        if (!fonts || fonts.length === 0) return;

        const inputvalue = Array.isArray(fonts) ? fonts.join('\n') : String(fonts);
        Applyfontproject(inputvalue);
    });
})();
