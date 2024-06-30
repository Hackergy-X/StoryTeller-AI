import { NextRequest } from "next/server";
import {RunEventType, RunOpts} from "@gptscript-ai/gptscript";
import g from "@/lib/gptScriptinstance";

const script = "app/api/run-script/story-book.gpt";

export async function POST(request: NextRequest) {
    const { story, pages, path } = await request.json();
    const opts: RunOpts = {
        disableCache: true,
        input: `--story ${story} --pages ${pages} --path ${path}`,
    };

    try{
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller){
                try{
                    const run = await g.run(script, opts);
                    run.on(RunEventType.Event, (data) => {
                        controller.enqueue(encoder.encode(
                            `event: ${JSON.stringify(data)}\n\n`
                        ));
                    });

                    await run.text();
                    controller.close();
                }catch(e){
                    controller.error(e);
                    console.log("Error", e);
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }catch(e){
        return new Response(JSON.stringify({error: e}), {
            status: 500,
        });
    }
}