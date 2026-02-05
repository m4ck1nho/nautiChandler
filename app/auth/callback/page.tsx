'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function DebugCallbackForAuth() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DebugContent />
        </Suspense>
    );
}

function DebugContent() {
    const searchParams = useSearchParams();
    const [info, setInfo] = useState<any>({});

    useEffect(() => {
        setInfo({
            href: window.location.href,
            search: window.location.search,
            hash: window.location.hash,
            origin: window.location.origin,
            codeParam: searchParams.get('code'),
            errorParam: searchParams.get('error'),
        });
    }, [searchParams]);

    return (
        <div className="p-8 font-mono text-sm break-all space-y-4">
            <h1 className="text-xl font-bold">Auth Callback Debugger</h1>
            <div className="bg-gray-100 p-4 rounded">
                <strong>Full URL:</strong> {info.href}
            </div>
            <div className="bg-gray-100 p-4 rounded">
                <strong>Query Params (Search):</strong> {info.search || '(none)'}
            </div>
            <div className="bg-gray-100 p-4 rounded">
                <strong>Hash Fragment:</strong> {info.hash || '(none)'}
            </div>
            <div className="p-4 border border-blue-200 bg-blue-50 rounded">
                <p><strong>Code Found?</strong> {info.codeParam ? 'YES' : 'NO'}</p>
                <p><strong>Error Found?</strong> {info.errorParam ? 'YES' : 'NO'}</p>
            </div>
            <p className="text-red-600 font-bold">
                Please take a screenshot of this page or copy the "Full URL" and send it to me.
            </p>
        </div>
    );
}
