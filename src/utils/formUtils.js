/**
 * Kiểm tra xem form có thay đổi so với dữ liệu gốc không
 * @param {Object} originalData - Dữ liệu gốc
 * @param {Object} currentData - Dữ liệu hiện tại từ form
 * @param {Array<string>} excludeFields - Các field cần bỏ qua khi so sánh
 * @returns {boolean} - true nếu có thay đổi, false nếu không có thay đổi
 */
export const hasFormChanged = (originalData, currentData, excludeFields = []) => {
    if (!originalData || !currentData) return true;

    // Lấy tất cả các keys từ currentData
    const keys = Object.keys(currentData).filter((key) => !excludeFields.includes(key));

    // So sánh từng field
    for (const key of keys) {
        const originalValue = originalData[key];
        const currentValue = currentData[key];

        // Xử lý các trường hợp đặc biệt
        if (originalValue === undefined && currentValue === undefined) continue;
        if (originalValue === null && currentValue === null) continue;
        if (originalValue === '' && currentValue === '') continue;

        // So sánh array
        if (Array.isArray(originalValue) && Array.isArray(currentValue)) {
            if (originalValue.length !== currentValue.length) return true;

            // So sánh array of objects (như genres)
            if (originalValue.length > 0 && typeof originalValue[0] === 'object') {
                const originalIds = originalValue.map((item) => item.id || item).sort();
                const currentIds = currentValue.map((item) => item.id || item).sort();
                if (JSON.stringify(originalIds) !== JSON.stringify(currentIds)) return true;
            } else {
                // So sánh array thông thường
                const sortedOriginal = [...originalValue].sort();
                const sortedCurrent = [...currentValue].sort();
                if (JSON.stringify(sortedOriginal) !== JSON.stringify(sortedCurrent)) return true;
            }
            continue;
        }

        // So sánh object
        if (typeof originalValue === 'object' && typeof currentValue === 'object') {
            if (JSON.stringify(originalValue) !== JSON.stringify(currentValue)) return true;
            continue;
        }

        // So sánh giá trị thông thường
        if (originalValue != currentValue) return true;
    }

    return false;
};

/**
 * Kiểm tra xem có file mới được upload không
 * @param {Array} fileList - Danh sách file từ Upload component
 * @param {string} originalUrl - URL ảnh gốc
 * @returns {boolean} - true nếu có file mới
 */
export const hasNewFile = (fileList, originalUrl) => {
    if (!fileList || fileList.length === 0) {
        return false;
    }

    const file = fileList[0];

    if (file.originFileObj) {
        return true;
    }

    if (file.url && file.url !== originalUrl) {
        return true;
    }

    return false;
};
