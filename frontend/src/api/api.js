const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

export const API_ORIGIN =
    import.meta.env.VITE_API_ORIGIN ||
    "http://localhost:5000";


const api = async (
    endpoint,
    options = {}
) => {

    const token =
        localStorage.getItem("token");


    const headers = {
        ...(options.headers || {}),
    };


    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {
        headers["Content-Type"] =
            "application/json";
    }


    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }


    const response =
        await fetch(
            `${API_URL}${endpoint}`,
            {
                ...options,
                headers,
            }
        );


    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }


    if (!response.ok) {
        throw new Error(
            data.message ||
            "Une erreur est survenue."
        );
    }


    return data;
};


// ============================================
// RACCOURCIS : api.get / post / put / patch / delete
// ============================================

const toBody = (data) =>
    data instanceof FormData
        ? data
        : JSON.stringify(data);


api.get = (endpoint, options = {}) =>
    api(endpoint, {
        ...options,
        method: "GET",
    });


api.post = (endpoint, data, options = {}) =>
    api(endpoint, {
        ...options,
        method: "POST",
        body: toBody(data),
    });


api.put = (endpoint, data, options = {}) =>
    api(endpoint, {
        ...options,
        method: "PUT",
        body: toBody(data),
    });


api.patch = (endpoint, data, options = {}) =>
    api(endpoint, {
        ...options,
        method: "PATCH",
        body: toBody(data),
    });


api.delete = (endpoint, options = {}) =>
    api(endpoint, {
        ...options,
        method: "DELETE",
    });


export default api;