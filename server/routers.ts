import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import axios from "axios";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Geographic classification router
  geographic: router({
    analyze: publicProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        const API_ENDPOINT = "https://yj5nbxrxq4.coze.site/stream_run";
        const API_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjA1NWIzNDljLTE5ZWItNGVhMC1iY2YzLTYwODFmY2Q4OTIyZiJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIlVIOE5CTzEyVTJCeEQyQmd5ZktNWFlHZkJRektYakc0Il0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzY3NTU0MzE3LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NTkxNTcwNjIxNDA2OTA0MzgzIiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NTkxNTg3OTg1NjkxMjQ2NTkyIn0.jDMb0Fwa-JQKkmM7VS3TiYQU27ZiKMxDyz4NrRwwwAUk-UMoWgD9NaXTWPVpX7PS5MannNTiL13whDUYvVoze6w4VZQMqm-CKzERlGxWPyvKObep4aEGmnKVvBSpccU8ZJAGuZxdwGNJOR7XazehGst5PRUN5D_23rACBUzVAC1WnIaNKhuorEBqtM4pyKYi0oH4z2VBgrxTvqy5U9aFQPlEn1iLYYp6Ob49EOe9uajK6jujXrXzV5bVuFcnD-dWYmxBKBfimJBp8eiyHpAZC_ao5vWtBcoduOGAHZfT56NxbY0meTtIVi-ENigMWJNDBYI2llKN5Z44n6-zOAC9CQ";
        const PROJECT_ID = 7591518110268817449;

        try {
          const response = await axios.post(
            API_ENDPOINT,
            {
              content: {
                query: {
                  prompt: [
                    {
                      type: 'text',
                      content: {
                        text: input.text
                      }
                    }
                  ]
                }
              },
              type: 'query',
              project_id: PROJECT_ID
            },
            {
              headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              responseType: 'text'
            }
          );

          // Parse SSE format response
          const lines = response.data.split('\n').filter((line: string) => line.trim());
          let markdownContent = '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonStr = line.substring(5).trim();
              try {
                const data = JSON.parse(jsonStr);
                if (data.type === 'answer' && data.content && data.content.answer) {
                  markdownContent += data.content.answer;
                }
              } catch (e) {
                continue;
              }
            }
          }

          if (!markdownContent) {
            throw new Error('No valid response content received from API');
          }

          // Parse markdown response
          const parsedLines = markdownContent.split('\n');
          let scope = '';
          let areas: Array<{ name: string; region: string; context: string }> = [];
          let summary = '';
          let confidence = '';
          let notes = '';
          
          let currentSection = '';
          let tableStarted = false;
          
          for (let i = 0; i < parsedLines.length; i++) {
            const line = parsedLines[i].trim();
            
            if (line.startsWith('### Geographic Scope')) {
              currentSection = 'scope';
              continue;
            } else if (line.startsWith('### Identified Areas')) {
              currentSection = 'areas';
              continue;
            } else if (line.startsWith('### Analysis Summary')) {
              currentSection = 'summary';
              continue;
            } else if (line.startsWith('### Confidence Level')) {
              currentSection = 'confidence';
              continue;
            } else if (line.startsWith('### Additional Notes')) {
              currentSection = 'notes';
              continue;
            }
            
            if (!line || line.startsWith('#') || line.startsWith('|--')) continue;
            
            switch (currentSection) {
              case 'scope':
                if (line) scope = line;
                break;
              case 'areas':
                if (line.startsWith('|')) {
                  if (!tableStarted) {
                    tableStarted = true;
                    continue;
                  }
                  const cells = line.split('|').map(c => c.trim()).filter(c => c);
                  if (cells.length >= 3) {
                    areas.push({ name: cells[0], region: cells[1], context: cells[2] });
                  }
                }
                break;
              case 'summary':
                if (line) summary += (summary ? ' ' : '') + line;
                break;
              case 'confidence':
                if (line) confidence = line;
                break;
              case 'notes':
                if (line) notes += (notes ? ' ' : '') + line;
                break;
            }
          }

          return { scope, areas, summary, confidence, notes };
        } catch (error) {
          console.error('Geographic analysis error:', error);
          throw new Error('Failed to analyze text');
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
