async function main() {
    // get GPU device
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) {
        fail('need a browser that supports WebGPU');
        return;
    }

    // Get a WebGPU context from the canvas and configure it
    const canvas = document.getElementById('webgpu-output');
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });

    const module = device.createShaderModule({
        label: 'our hardcoded red triangle shaders',
        code: `
            struct VertexOut {
                @builtin(position) pos: vec4f,
                @location(0) color: vec4f
            };

            @vertex 
            fn vs(
                @builtin(vertex_index) vertexIndex : u32
            ) -> VertexOut {
                let pos = array(
                    vec2f(   0,  0.8),  // top center
                    vec2f(-0.8, -0.8),  // bottom left
                    vec2f( 0.8, -0.8)   // bottom right
                );

                let color = array(
                    vec4f(1.0, .0, .0, .0),
                    vec4f( .0, 1., .0, .0),
                    vec4f( .0, .0, 1., .0)
                );

                var out: VertexOut;
                out.pos = vec4f(pos[vertexIndex], 0.0, 1.0);
                out.color = color[vertexIndex];

                return out;
            }

            @fragment 
            fn fs(in: VertexOut) -> @location(0) vec4f {
                return in.color;
            }
        `,
    });

    const pipeline = device.createRenderPipeline({
        label: 'our hardcoded red triangle pipeline',
        layout: 'auto',
        vertex: {
        module,
        },
        fragment: {
        module,
        targets: [{ format: presentationFormat }],
        },
    });

    const renderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
        {
            // view: <- to be filled out when we render
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store',
        },
        ],
    };

    function render() {
        // Get the current texture from the canvas context and
        // set it as the texture to render to.
        renderPassDescriptor.colorAttachments[0].view =
            context.getCurrentTexture().createView();

        // make a command encoder to start encoding commands
        const encoder = device.createCommandEncoder({ label: 'our encoder' });

        // make a render pass encoder to encode render specific commands
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.draw(3);  // call our vertex shader 3 times.
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    render();
}

function fail(msg) {
    alert(msg);
}

main();