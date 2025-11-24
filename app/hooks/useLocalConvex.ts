import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { FunctionReference, OptionalRestArgs } from "convex/server";


const queryReferenceIds = new WeakMap<object, number>();
let nextQueryId = 0;


function getQueryId(queryReference: any): number {
    if (!queryReferenceIds.has(queryReference)) {
        queryReferenceIds.set(queryReference, nextQueryId++);
    }
    return queryReferenceIds.get(queryReference)!;
}

function getCacheKey(
    queryReference: FunctionReference<"query">,
    args: any
): string {
    const queryId = getQueryId(queryReference);
    const argsKey = JSON.stringify(args || {});
    return `convex_cache:q${queryId}:${argsKey}`;
}

type CacheListener = () => void;
const cacheListeners = new Map<string, Set<CacheListener>>();

function subscribeToCacheKey(cacheKey: string, listener: CacheListener) {
    if (!cacheListeners.has(cacheKey)) {
        cacheListeners.set(cacheKey, new Set());
    }
    cacheListeners.get(cacheKey)!.add(listener);

    return () => {
        const listeners = cacheListeners.get(cacheKey);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                cacheListeners.delete(cacheKey);
            }
        }
    };
}

function notifyCacheListeners(cacheKey: string) {
    const listeners = cacheListeners.get(cacheKey);
    if (listeners) {
        listeners.forEach(listener => listener());
    }
}


export function useLocalQuery<Query extends FunctionReference<"query">>(
    queryReference: Query,
    ...args: OptionalRestArgs<Query>
): typeof serverData {
    const queryArgs = args[0];
    const cacheKey = getCacheKey(queryReference, queryArgs);

    const serverData = useQuery(queryReference, queryArgs);

    const [localData, setLocalData] = useState(() => {
        if (typeof window === "undefined") return undefined;

        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            console.warn(`Failed to load cache for ${cacheKey}:`, error);
        }
        return undefined;
    });

    const hasReceivedServerData = useRef(false);

    useEffect(() => {
        const handleCacheUpdate = () => {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const newData = JSON.parse(cached);
                    setLocalData(newData);
                }
            } catch (error) {
                console.warn(`Failed to update from cache for ${cacheKey}:`, error);
            }
        };

        return subscribeToCacheKey(cacheKey, handleCacheUpdate);
    }, [cacheKey]);

    useEffect(() => {
        if (serverData !== undefined) {
            hasReceivedServerData.current = true;
            setLocalData(serverData);

            try {
                localStorage.setItem(cacheKey, JSON.stringify(serverData));
            } catch (error) {
                console.warn(`Failed to cache data for ${cacheKey}:`, error);
            }
        }
    }, [serverData, cacheKey]);

    return hasReceivedServerData.current ? serverData : localData;
}
export function useLocalMutation<Mutation extends FunctionReference<"mutation">>(
    mutationReference: Mutation
) {
    const serverMutation = useMutation(mutationReference);

    return useCallback(
        async (args: any) => {
            try {
                const result = await serverMutation(args);
                return result;
            } catch (error) {
                console.error("Mutation failed:", error);
                throw error;
            }
        },
        [serverMutation]
    );
}

export function useOptimisticMutation<Mutation extends FunctionReference<"mutation">>(
    mutationReference: Mutation,
    options?: {
        onOptimisticUpdate?: (args: any) => void;
        onSuccess?: (result: any) => void;
        onError?: (error: any) => void;
    }
) {
    const serverMutation = useMutation(mutationReference);

    return useCallback(
        async (args: any) => {
            if (options?.onOptimisticUpdate) {
                options.onOptimisticUpdate(args);
            }

            try {

                const result = await serverMutation(args);

                if (options?.onSuccess) {
                    options.onSuccess(result);
                }

                return result;
            } catch (error) {
                console.error("Mutation failed:", error);

                if (options?.onError) {
                    options.onError(error);
                }

                throw error;
            }
        },
        [serverMutation, options]
    );
}


export function updateQueryCache<Query extends FunctionReference<"query">>(
    queryReference: Query,
    args: any,
    updater: (currentData: any) => any
): void {
    const cacheKey = getCacheKey(queryReference, args);

    try {
        const cached = localStorage.getItem(cacheKey);
        const currentData = cached ? JSON.parse(cached) : undefined;
        const newData = updater(currentData);
        localStorage.setItem(cacheKey, JSON.stringify(newData));

        notifyCacheListeners(cacheKey);
    } catch (error) {
        console.warn(`Failed to update cache for ${cacheKey}:`, error);
    }
}

export function clearQueryCache<Query extends FunctionReference<"query">>(
    queryReference: Query,
    args: any
): void {
    const cacheKey = getCacheKey(queryReference, args);

    try {
        localStorage.removeItem(cacheKey);
        notifyCacheListeners(cacheKey);
    } catch (error) {
        console.warn(`Failed to clear cache for ${cacheKey}:`, error);
    }
}

export function clearAllCaches(): void {
    if (typeof window === "undefined") return;

    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith("convex_cache:")) {
                localStorage.removeItem(key);
            }
        });

        cacheListeners.forEach((listeners, cacheKey) => {
            notifyCacheListeners(cacheKey);
        });
    } catch (error) {
        console.warn("Failed to clear all caches:", error);
    }
}
