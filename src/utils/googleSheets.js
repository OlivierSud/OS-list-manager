const API_KEY = 'AIzaSyBA2lV9mm9_tNIpErOd9yO5lMjlIYtlCwM'; // Provided by user
const SPREADSHEET_ID = '17nkELFwjGJrOjCBHTunDsAdg1GE6ylIZYc6jblAB-ps'; // Provided by user

const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

export const fetchSheetData = async (range = 'Sheet1!A:Z') => {
    try {
        const response = await fetch(`${BASE_URL}/values/${range}?key=${API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.error('Error fetching sheet:', data.error);
            throw new Error(data.error.message);
        }

        return data.values || [];
    } catch (error) {
        console.error('Google Sheets API Error:', error);
        return null;
    }
};

/**
 * NOTE: Writing to Google Sheets requires OAuth 2.0 token, NOT just an API Key.
 * This function will likely fail 401/403 with just an API Key unless the sheet is
 * public writable (which is rare/insecure).
 * 
 * To make this work securely, we need to implement Google Sign-In.
 */
export const appendRow = async (range, values) => {
    // Check if we have an access token (placeholder for future OAuth implementation)
    const accessToken = localStorage.getItem('google_access_token');

    if (!accessToken) {
        console.warn('Cannot write to sheet: No access token. API Key is read-only for private sheets.');
        return false;
    }

    try {
        const response = await fetch(`${BASE_URL}/values/${range}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                values: [values]
            })
        });

        const data = await response.json();
        return !data.error;
    } catch (error) {
        console.error('Error appending row:', error);
        return false;
    }
};
