import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testWebSight() {
    console.log('Starting WebSight MCP server...');

    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js'],
    });

    const client = new Client(
        {
            name: 'test-client',
            version: '1.0.0',
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        console.log('Connected to WebSight server');

        // List available tools
        const tools = await client.listTools();
        console.log('\nAvailable tools:');
        tools.tools.forEach(tool => {
            console.log(`- ${tool.name}: ${tool.description}`);
        });

        // Test the navigate tool
        console.log('\nTesting navigate tool...');
        const result = await client.callTool('navigate', {
            url: 'https://example.com',
        });

        console.log('\nNavigation result:');
        console.log(result.content[0].text);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nTest completed');
    }
}

// Run the test
testWebSight().catch(console.error);
