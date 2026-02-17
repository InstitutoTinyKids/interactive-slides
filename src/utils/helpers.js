export const validateProject = (project) => {
    if (!project.name || project.name.trim().length === 0) {
        return { valid: false, message: 'El nombre del proyecto es obligatorio.' };
    }
    if (project.name.length > 50) {
        return { valid: false, message: 'El nombre es demasiado largo (máx. 50 caracteres).' };
    }
    return { valid: true };
};

export const safeJsonPaste = (jsonStr) => {
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('JSON Parse error:', e);
        return null;
    }
};

export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};
