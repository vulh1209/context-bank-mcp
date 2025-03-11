#!/usr/bin/env node
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
async function callChatAPI() {
    try {
        const response = await axios.post(`${process.env.ONYX_API_BASE}/api/chat/send-message`, {
            alternate_assistant_id: 0,
            chat_session_id: "e22c4ae6-ad90-4375-9ba4-179cf3af618e",
            message: "Thông tin Sipher",
            prompt_id: 0,
            search_doc_ids: null,
            file_descriptors: [],
            regenerate: false,
            retrieval_options: {
                run_search: "auto",
                real_time: true,
                filters: {
                    source_type: null,
                    document_set: null,
                    time_cutoff: null,
                    tags: [],
                },
            },
            prompt_override: null,
            llm_override: {
                model_provider: "Default",
                model_version: "gpt-4o",
            },
            use_agentic_search: false,
            parent_message_id: null,
        }, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return JSON.parse(response.data.split(`{"agentic_message_ids": []}`)?.[1]);
    }
    catch (error) {
        console.log(error);
    }
}
async function makeOnyxRequestStream(url, body) {
    const headers = {
        "Content-Type": "application/json",
    };
    try {
        const response = await axios.post(url, body, { headers });
        if (!response.data) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const res = magicConvert(response.data);
        return res;
    }
    catch (error) {
        console.error("Error making Onyx request:", error);
        return null;
    }
}
const magicConvert = (data) => {
    try {
        return JSON.parse(data);
    }
    catch (error) {
        return JSON.parse(data.split(`{"agentic_message_ids": []}`)?.[1]);
    }
};
async function test() {
    const body = {
        alternate_assistant_id: 0,
        chat_session_id: "e22c4ae6-ad90-4375-9ba4-179cf3af618e",
        message: "Thông tin Sipher",
        prompt_id: 0,
        search_doc_ids: null,
        file_descriptors: [],
        regenerate: false,
        retrieval_options: {
            run_search: "auto",
            real_time: true,
            filters: {
                source_type: null,
                document_set: null,
                time_cutoff: null,
                tags: [],
            },
        },
        prompt_override: null,
        llm_override: {
            model_provider: "Default",
            model_version: "gpt-4o",
        },
        use_agentic_search: false,
        parent_message_id: null,
    };
    const res = (await makeOnyxRequestStream(`${process.env.ONYX_API_BASE}/api/chat/send-message`, body));
    return res?.message;
}
// Call the function
test()
    .then((data) => {
    console.log(data);
})
    .catch((error) => {
    console.log(error);
});
