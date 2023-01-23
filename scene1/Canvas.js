// global vars
var canvas = null;
var gl = null; // WebGL context
var bFullscreen = false;
var canvas_original_width;
var canvas_original_height;

const WebGLMacros = // when whole 'WebGL Macros' is 'const', all inside it are automatically const' 
{
    VDG_ATTRIBUTE_VERTEX: 0,
    VDG_ATTRIBUTE_COLOR: 1,
    VDG_ATTRIBUTE_NORMAL: 2,
    VDG_ATTRIBUTE_TEXTURE0: 3
};

var vertexShaderObject;
var fragmentShaderObject;
var shaderProgramObject;

var sphere=null;

var modelUniform;
var viewUniform;
var projectionUniform;
var mvpUniform;
var perspectiveProjectionMatrix;
var angleRotationMoonLight = 120.0;
var year = 0;
var day = 0;

var vbo_texture_sun;
var texture_sun = 0;
var samplerUniform;

var vbo_texture_earth;
var texture_earth = 0;

var vbo_texture_moon;
var texture_moon = 0;

var vbo_texture_cosmos;
var texture_cosmos = 0;

var vao_cube;
var vbo_position_cube;
var angleOfEarthRevolution = 65.0; // For focusing on BHARAT :) \m/
var angleOfSunRevolution = 0.0;
var play = true;


const DISTANCE_LIGHT = 100.0;
var blKeyPressed=false;
var light_ambient= new Float32Array([
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.0]);
var light_diffuse= new Float32Array([
    0.0, 0.0, 0.0,
    1.0, 1.0, 1.0,
    0.0, 0.0, 0.0]);
var light_specular= new Float32Array([
    0.0, 0.0, 0.0,
    0.1, 0.1, 0.1,
    0.0, 0.0, 0.0]);
var light_position= new Float32Array([
    0.0, DISTANCE_LIGHT, DISTANCE_LIGHT, 1.0,
	-DISTANCE_LIGHT, -3.0, DISTANCE_LIGHT, 1.0,
	DISTANCE_LIGHT, DISTANCE_LIGHT, -DISTANCE_LIGHT, 1.0
    ]); 

var material_ambient= new Float32Array([0.0, 0.0, 0.0]);
var material_diffuse= new Float32Array([1.0, 1.0, 1.0]);
var material_specular= new Float32Array([1.0, 1.0, 1.0]);
var material_shininess= 128.0;

class ShaderUniforms
{
    constructor(){}
    modelMatrixUniform;
    viewMatrixUniform;
    projectionMatrixUniform;
    laUniform;
    ldUniform;
    lsUniform;
    lightPositionUniform;
    kaUniform;
    kdUniform;
    ksUniform;
    materialShininessUniform;
    LKeyPressedUniform;
}
var PerFragmentUniforms = new ShaderUniforms();
var blendUniform;

// To start animation : To have requestAnimation Frame() to be called "cross-browser" compatible 
var requestAnimationFrame =
window.requestAnimationFrame ||
window.webkitRequestAnimationFrame ||
window.mozRequestAnimationFrame ||
window.oRequestAnimationFrame ||
window.msRequestAnimationFrame;

// To stop animation : To have cancelAnimation Frame() to be called "cross browser" compatible 
var cancelAnimationFrame =
window.cancelAnimationFrame ||
window.webkitCancelRequestAnimationFrame || window.webkitCancelAnimationFrame ||
window.mozCancelRequestAnimationFrame || window.mozCancelAnimationFrame ||
window.oCancelRequestAnimationFrame || window.oCancelAnimationFrame ||
window.msCancelRequestAnimationFrame || window.msCancelAnimationFrame;

// onload function
function main() {
    // get <canvas> element 
    canvas = document.getElementById("AMC");
    if (!canvas)
        console.log("Obtaining Canvas Failed\n");
    else
        console.log("Obtaining Canvas Succeeded\n");

    canvas_original_width = canvas.width;
    canvas_original_height = canvas.height;

    // print canvas width and height on console 
    console.log("Canvas Width : " + canvas.width + " And Canvas Height : " + canvas.height);

    // register keyboard's keydown event handler 
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("click", mouseDown, false);
    window.addEventListener("resize", resize, false);

    // initialize WebGL 
    init();

    // start drawing here as warming-up 
    resize();
    draw();
}

function playMusicAndStart() {
    document.getElementById("audS1").play();
    startAnimation();
}

function startAnimation() {
    document.getElementById("idMusicConfirm").innerHTML = "";
    main();
}

function toggleFullscreen() {
    // code 
    var fullscreen_element = document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null;

    // if not fullscreen 
    if (fullscreen_element == null) {
        if (canvas.requestFullscreen)
            canvas.requestFullscreen();
        else if (canvas.mozRequestFullScreen)
            canvas.mozRequestFullScreen();
        else if (canvas.webkitRequestFullscreen)
            canvas.webkitRequestFullscreen();
        else if (canvas.msRequestFullscreen)
            canvas.msRequestFullscreen();
        bFullscreen = true;
    }
    else // if already fullscreen
    {
        if (document.exitFullscreen)
            document.exitFullscreen();
        else if (document.mozCancelFullScreen)
            document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen)
            document.webkitExitFullscreen();
        else if (document.msExitFullscreen)
            document.msExitFullscreen();
        bFullscreen = false;
    }
}

function init() {
    // code 
    // get WebGL 2.0 context 
    gl = canvas.getContext("webgl2");

    if (gl == null) // failed to get context 
    {
        console.log("Failed to get the rendering context for WebGL");
        return;
    }

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    // vertex shader 
    var vertexShaderSourceCode =
        "#version 300 es" +
        "\n" +
		"in vec4 vPosition;" +
        "in vec4 vColor;" +
        "in vec2 vTexcoord;" +
		"in vec3 vNormal;" +
        "out vec2 out_texcoord;" +
        "uniform mat4 u_model_matrix;" + 
        "uniform mat4 u_view_matrix;" + 
        "uniform mat4 u_projection_matrix;" + 
		"uniform mediump int u_isLKeyPressed;" +
		"uniform vec4 u_light_position[3];" +
		"out vec3 tNorm[3];" +
		"out vec3 light_direction[3];" +
		"out vec3 viewer_vector[3];" +
        "out vec4 outColor;" +
        "out vec2 outTexcoord;" +
		"uniform highp float u_blend;" +
        "out float outBlend;" +
		"void main(void)" +
		"{" +
		"	if(u_isLKeyPressed == 1)" +
		"	{" +
		"		for(int loopIndex = 0; loopIndex < 3; loopIndex++)" +
		"		{" +
		"			vec4 eye_coordinates = u_view_matrix * u_model_matrix * vPosition;" +
		"			tNorm[loopIndex] = mat3(u_view_matrix * u_model_matrix) * vNormal;" +
		"			light_direction[loopIndex] = vec3(u_light_position[loopIndex] - eye_coordinates);" +
		"			viewer_vector[loopIndex] = normalize(vec3(-eye_coordinates.xyz));" +
		"		}" +
		"	}" +
		"\n" +
		"	gl_Position = u_projection_matrix * u_view_matrix * u_model_matrix * vPosition;" +
        "outColor = vColor;" +
        "outTexcoord = vTexcoord;" +
        "outBlend = u_blend;" +
		"}";

    vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
    gl.compileShader(vertexShaderObject);

    if(gl.getShaderParameter(vertexShaderObject,gl.COMPILE_STATUS) == false) {
        var error = gl.getShaderInfoLog(vertexShaderObject);
        if (error.length > 0) {
            alert(error);
            uninitialize();
        }
    }

    // fragment shader 
    var fragmentShaderSourceCode =
        "#version 300 es" +
        "\n" +
        "precision highp float;" +
		"uniform vec3 u_la[3];" +
		"uniform vec3 u_ld[3];" +
		"uniform vec3 u_ls[3];" +
		"uniform vec3 u_ka;" +
		"uniform vec3 u_kd;" +
		"uniform vec3 u_ks;" +
		"uniform float u_shinyness;" +
		"in vec3 tNorm[3];" +
		"in vec3 light_direction[3];" +
		"in vec3 viewer_vector[3];" +
        "in vec2 outTexcoord;" +
        "uniform sampler2D uSampler;" +
        "in vec4 outColor;" +
        "vec4 Texture;" +
		"out vec4 FragColor;" +
        "uniform int u_isLKeyPressed;" +
        "in float outBlend;" +
		"\n" +
		"void main(void)" +
		"{" +
		"	vec3 phong_ads_light;" +
		"\n" +
		"	if(u_isLKeyPressed == 1)" +
		"	{" +
		"		phong_ads_light[0] = 0.0;" +
		"		phong_ads_light[1] = 0.0;" +
		"		phong_ads_light[2] = 0.0;" +
		"\n" +
		"		for(int loopIndex = 0; loopIndex < 3; loopIndex++)" +
		"		{" +
		"			vec3 normalized_tNorm = normalize(tNorm[loopIndex]);" +
		"			vec3 normalized_light_direction = normalize(light_direction[loopIndex]);" +
		"			vec3 normalized_viewer_vector = normalize(viewer_vector[loopIndex]);" +
		"\n" +
		"			vec3 reflection_vector = reflect(-normalized_light_direction, normalized_tNorm);" +
		"			float tnDotLightDir = max(dot(normalized_light_direction, normalized_tNorm), 0.0);" +
		"\n" +
		"			vec3 ambient = u_la[loopIndex] * u_ka;" +
		"			vec3 diffuse = u_ld[loopIndex] * u_kd * tnDotLightDir;" +
		"			vec3 specular = u_ls[loopIndex] * u_ks * pow( max( dot(reflection_vector, normalized_viewer_vector), 0.0f), u_shinyness);" +
		"			phong_ads_light = phong_ads_light + ambient + diffuse + specular;" +
		"		}" +
		"	}" +
		"	else" +
		"	{" +
		"		phong_ads_light = vec3(1.0, 1.0, 1.0);" +
		"	}" +
		"\n" +
        "   Texture = texture(uSampler,outTexcoord);" +
		"	FragColor = Texture * vec4(1.0,1.0,1.0, outBlend) * vec4(phong_ads_light, outBlend);" +
		"}";

    fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
    gl.compileShader(fragmentShaderObject);

    if (gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS) == false) {
        error = gl.getShaderInfoLog(fragmentShaderObject);
        if (error.length > 0) {
            alert(error);
            uninitialize();
        }
    }

    // shader program 
    shaderProgramObject = gl.createProgram();
    gl.attachShader(shaderProgramObject, vertexShaderObject);
    gl.attachShader(shaderProgramObject, fragmentShaderObject);

    // pre-link binding of shader program object with vertex shader attributes 
    gl.bindAttribLocation(shaderProgramObject, WebGLMacros.VDG_ATTRIBUTE_VERTEX, "vPosition");
    gl.bindAttribLocation(shaderProgramObject, WebGLMacros.VDG_ATTRIBUTE_COLOR, "vColor");
    gl.bindAttribLocation(shaderProgramObject, WebGLMacros.VDG_ATTRIBUTE_NORMAL, "vNormal");
    gl.bindAttribLocation(shaderProgramObject, WebGLMacros.VDG_ATTRIBUTE_TEXTURE0, "vTexCoord");

    // linking 
    gl.linkProgram(shaderProgramObject);
    if (!gl.getProgramParameter(shaderProgramObject, gl.LINK_STATUS)) {
        var error = gl.getProgramInfoLog(shaderProgramObject);
        if (error.length > 0) {
            alert(error);
            uninitialize();
        }
    }

    // Load textures
    texture_sun = gl.createTexture();
    texture_sun.image = new Image();
    // texture_sun.image.crossOrigin = "*";
    texture_sun.image.src = "sun.png";
    texture_sun.image.onload = function()
    {
        gl.bindTexture(gl.TEXTURE_2D, texture_sun);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_sun.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    texture_earth = gl.createTexture();
    texture_earth.image = new Image();
    // texture_earth.image.crossOrigin = "*";
    texture_earth.image.src = "earth.png";
    texture_earth.image.onload = function()
    {
        gl.bindTexture(gl.TEXTURE_2D, texture_earth);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_earth.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    
    texture_moon = gl.createTexture();
    texture_moon.image = new Image();
    // texture_moon.image.crossOrigin = "*";
    texture_moon.image.src = "moon.png";
    texture_moon.image.onload = function()
    {
        gl.bindTexture(gl.TEXTURE_2D, texture_moon);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_moon.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    
    texture_cosmos = gl.createTexture();
    texture_cosmos.image = new Image();
    // texture_cosmos.image.crossOrigin = "*";
    texture_cosmos.image.src = "cosmos.jpg";
    texture_cosmos.image.onload = function()
    {
        gl.bindTexture(gl.TEXTURE_2D, texture_cosmos);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_cosmos.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    
    //============== RECTANGLE ====================
    var cubeVertices = new Float32Array([
        1.0, 1.0, 0.0,
        -1.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
    ]);

    var quadTexCoord = new Float32Array([
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,
		1.0, 0.0
    ]);

    vao_cube = gl.createVertexArray();
    gl.bindVertexArray(vao_cube);

    vbo_position_cube = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_position_cube);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.VDG_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.VDG_ATTRIBUTE_VERTEX);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    vbo_texture_cube = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_texture_cube);
    gl.bufferData(gl.ARRAY_BUFFER, quadTexCoord, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.VDG_ATTRIBUTE_TEXTURE0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.VDG_ATTRIBUTE_TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);

    // get MVP uniform location 
    samplerUniform = gl.getUniformLocation(shaderProgramObject, "uSampler");
    modelUniform = gl.getUniformLocation(shaderProgramObject, "u_model_matrix");
    viewUniform = gl.getUniformLocation(shaderProgramObject, "u_view_matrix");
    projectionUniform = gl.getUniformLocation(shaderProgramObject, "u_projection_matrix");
    blendUniform = gl.getUniformLocation(shaderProgramObject, "u_blend");

    PerFragmentUniforms.LKeyPressedUniform = gl.getUniformLocation(shaderProgramObject, "u_isLKeyPressed");

    PerFragmentUniforms.laUniform = gl.getUniformLocation(shaderProgramObject, "u_la");
    PerFragmentUniforms.ldUniform = gl.getUniformLocation(shaderProgramObject, "u_ld");
    PerFragmentUniforms.lsUniform = gl.getUniformLocation(shaderProgramObject, "u_ls");
    PerFragmentUniforms.lightPositionUniform = gl.getUniformLocation(shaderProgramObject, "u_light_position");

    PerFragmentUniforms.kaUniform = gl.getUniformLocation(shaderProgramObject, "u_ka");
    PerFragmentUniforms.kdUniform = gl.getUniformLocation(shaderProgramObject, "u_kd");
    PerFragmentUniforms.ksUniform = gl.getUniformLocation(shaderProgramObject, "u_ks");
    PerFragmentUniforms.materialShininessUniform = gl.getUniformLocation(shaderProgramObject, "u_shinyness");

    // *** vertices, colors, shader attribs, vbo, vao initializations *** 
    sphere = new Mesh();
    makeSphere(sphere, 1.10, 40, 40);

    // set clear color 
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LEQUAL);
    // We will always cull back faces for better performance
    gl.enable(gl.CULL_FACE); 

    // initialize projection matrix 
    perspectiveProjectionMatrix = mat4.create();
}

function resize() {
    // code 
    if (bFullscreen == true) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    else {
        canvas.width = canvas_original_width;
        canvas.height = canvas_original_height;
    }

    if(canvas.height == 0)
    {
        canvas.height = 1;
    }
    // set the viewport to match 
    gl.viewport(0, 0, canvas.width, canvas.height);

    mat4.perspective(perspectiveProjectionMatrix, 45.0, parseFloat(canvas.width)/parseFloat(canvas.height), 0.1, 100.0);
}

let cameraX = -1.50;
let cameraY = 0.0;
let cameraZ = 0.0;
let startOffsetModelX = 9.0;
var scene_2 = false;

function draw() {
    // code
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgramObject);
    selectedUniforms = PerFragmentUniforms;

    var modelViewMatrix = mat4.create();
    var translationMatrix = mat4.create();
    var rotationMatrix = mat4.create();
    var scaleMatrix = mat4.create();
    var modelViewProjectionMatrix = mat4.create();
    var camera = mat4.create();

    var modelMatrix = mat4.create();
    var viewMatrix = mat4.create();
    var projectionMatrix = mat4.create();

    mat4.identity(camera);    
    mat4.translate(camera, camera, [-cameraX, cameraY, -cameraZ]);
    
    mat4.identity(viewMatrix);
    mat4.multiply(viewMatrix, viewMatrix, camera);
    
    // UNCHANGED FOR ALL GEOMETRIES
    projectionMatrix = perspectiveProjectionMatrix;

    // 1] SUN
    mat4.translate(modelMatrix, modelMatrix, [startOffsetModelX+ -1.60, 1.0, -5.50]); // translationMatrix);
    mat4.rotateY(modelMatrix, modelMatrix, degToRad(angleOfSunRevolution));
    
    gl.uniformMatrix4fv(modelUniform, false, modelMatrix);
    gl.uniformMatrix4fv(viewUniform, false, viewMatrix);
    gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);

    gl.uniform1i(selectedUniforms.LKeyPressedUniform, 0);
    gl.uniform1f(blendUniform, 0.98);
    // bind with texture
    gl.bindTexture(gl.TEXTURE_2D, texture_sun);
    gl.uniform1i(samplerUniform, 0);

    sphere.draw();
    gl.bindTexture(gl.TEXTURE_2D, null);

    // 2] EARTH
    modelMatrix = mat4.create();

    mat4.translate(modelMatrix, modelMatrix, [startOffsetModelX+2.40, -0.750, -4.0]);
    mat4.scale(modelMatrix, modelMatrix, [0.34, 0.34, 0.34]);
    mat4.rotateZ(modelMatrix, modelMatrix, degToRad(-70.0));
    mat4.rotateY(modelMatrix, modelMatrix, degToRad(270));
    mat4.rotateZ(modelMatrix, modelMatrix, degToRad(angleOfEarthRevolution));
    
    gl.uniformMatrix4fv(modelUniform, false, modelMatrix);
    gl.uniformMatrix4fv(viewUniform, false, viewMatrix);
    gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);
 
    gl.uniform1i(selectedUniforms.LKeyPressedUniform, 1);
    gl.uniform1f(blendUniform, 0.99);
    // setting light properties
    gl.uniform3fv(selectedUniforms.laUniform, light_ambient); // diffuse intensity of light 
    gl.uniform3fv(selectedUniforms.ldUniform, light_diffuse);
    gl.uniform3fv(selectedUniforms.lsUniform, light_specular);
    
    // setting material properties 
    gl.uniform3fv(selectedUniforms.kaUniform, material_ambient); // diffuse intensity of light 
    gl.uniform3fv(selectedUniforms.kdUniform, material_diffuse);
    gl.uniform3fv(selectedUniforms.ksUniform, material_specular);
    gl.uniform1f(selectedUniforms.materialShininessUniform, material_shininess); // diffuse reflectivity of material 
    
    light_position[1] = DISTANCE_LIGHT * Math.cos(degToRad(180.0));
    light_position[4] = DISTANCE_LIGHT * Math.cos(degToRad(180.0));
    light_position[8] = DISTANCE_LIGHT * Math.cos(degToRad(180.0));

    light_position[2] = DISTANCE_LIGHT * Math.sin(degToRad(180.0));
    light_position[6] = DISTANCE_LIGHT * Math.sin(degToRad(180.0));
    light_position[9] = DISTANCE_LIGHT * Math.sin(degToRad(180.0));
    gl.uniform4fv(selectedUniforms.lightPositionUniform, light_position); // light position

    // bind with texture
    gl.bindTexture(gl.TEXTURE_2D, texture_earth);
    gl.uniform1i(samplerUniform, 0);

    sphere.draw();
    gl.bindTexture(gl.TEXTURE_2D, null);

    // 3] MOON
    modelMatrix = mat4.create();

    mat4.translate(modelMatrix, modelMatrix, [startOffsetModelX+ 2.450 + 0.35, -0.220, -4.4]);
    mat4.scale(modelMatrix, modelMatrix, [0.075, 0.075, 0.075]);

    gl.uniformMatrix4fv(modelUniform, false, modelMatrix);
    gl.uniformMatrix4fv(viewUniform, false, viewMatrix);
    gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);
 
    gl.uniform1i(selectedUniforms.LKeyPressedUniform, 1);
    gl.uniform1f(blendUniform, fadeOutScene2);
    // setting light properties
    gl.uniform3fv(selectedUniforms.laUniform, light_ambient); // diffuse intensity of light 
    gl.uniform3fv(selectedUniforms.ldUniform, light_diffuse);
    gl.uniform3fv(selectedUniforms.lsUniform, light_specular);
    
    // setting material properties 
    gl.uniform3fv(selectedUniforms.kaUniform, material_ambient); // diffuse intensity of light 
    gl.uniform3fv(selectedUniforms.kdUniform, material_diffuse);
    gl.uniform3fv(selectedUniforms.ksUniform, material_specular);
    gl.uniform1f(selectedUniforms.materialShininessUniform, material_shininess); // diffuse reflectivity of material 
    
    light_position[1] = DISTANCE_LIGHT * Math.cos(degToRad(angleRotationMoonLight));
    light_position[4] = DISTANCE_LIGHT * Math.cos(degToRad(angleRotationMoonLight));
    light_position[8] = DISTANCE_LIGHT * Math.cos(degToRad(angleRotationMoonLight));

    light_position[2] = DISTANCE_LIGHT * Math.sin(degToRad(angleRotationMoonLight));
    light_position[6] = DISTANCE_LIGHT * Math.sin(degToRad(angleRotationMoonLight));
    light_position[9] = DISTANCE_LIGHT * Math.sin(degToRad(angleRotationMoonLight));
    gl.uniform4fv(selectedUniforms.lightPositionUniform, light_position); // light position

    // bind with texture
    gl.bindTexture(gl.TEXTURE_2D, texture_moon);
    gl.uniform1i(samplerUniform, 0);

    sphere.draw();
    gl.bindTexture(gl.TEXTURE_2D, null);

    // 4] Cosmos
    modelMatrix = mat4.create();
    mat4.identity(modelMatrix);
        
    mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -5.0]);
    mat4.scale(modelMatrix, modelMatrix, [14.950, 3.0, 1.0]); // stars_1

    gl.uniformMatrix4fv(modelUniform, false, modelMatrix);
    gl.uniformMatrix4fv(viewUniform, false, viewMatrix);
    gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);
    
    gl.uniform1i(selectedUniforms.LKeyPressedUniform, 0);
    gl.uniform1f(blendUniform, blendScene2);
    // bind with texture
    gl.bindTexture(gl.TEXTURE_2D, texture_cosmos);
    gl.uniform1i(samplerUniform, 0);
    
    gl.bindVertexArray(vao_cube);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.useProgram(null);

    if(play){
        if(scene_2){
            update_scene_2();
        }
        else{
            if(scene_3){

            }
            else{
                update();
            }
        }
    }
    
    // animation loop 
    requestAnimationFrame(draw, canvas);
}

var speedFactor = 4.0;
function update(){
    angleOfEarthRevolution = angleOfEarthRevolution + 0.3; // FINAL
    if(angleOfEarthRevolution >= 360.0)
        angleOfEarthRevolution = 0.0;
        
    angleOfSunRevolution = angleOfSunRevolution + 0.0009;
    if(angleOfSunRevolution >= 360.0)
        angleOfSunRevolution = 0.0;

    if(cameraX <= 10.250){
        cameraX += 0.02; // FINAL
    }
    else
    {
        if(cameraZ >= -2.80){
            cameraZ -= (0.002 * speedFactor);
            cameraY += (0.00065 * speedFactor);
            cameraX += (0.0006 * speedFactor);
        }
        else{
            if(cameraZ >= -3.9){ //3.8
                cameraZ -= (0.001 * speedFactor);
                cameraY -= (0.00065 * speedFactor);
                cameraX += (0.00055 * speedFactor);
            }
            else{
                scene_2 = true;
                angleRotationMoonLight = -30.0;
            }
        }        
    }
}

var blendScene2 = 1.0;
var fadeOutScene2 = 0.90;
var scene_3 = false;

function update_scene_2(){
    if(cameraZ >= -4.2){ //4.8
        cameraZ -= (0.001); // * speedFactor);
    }

    if(angleRotationMoonLight <= 300.0)
        angleRotationMoonLight = angleRotationMoonLight + 0.50;
    else{
        if(fadeOutScene2 >= 0)
            fadeOutScene2 -= 0.01;
        else{
            scene_2 = false;
            scene_3 = true;
            showScene2();
        }
    }
    
    if(blendScene2 >= 0.1)
        blendScene2 -= 0.01;
}

function uninitialize() 
{ 
    // code 
    if(sphere)
    {
        sphere.deallocate(); 
        sphere=null; 
    }
    if(vbo_texture_sun)
    {
        gl.deleteBuffer(vbo_texture_sun);
        vbo_texture_sun = null;
    }
    if(texture_sun)
    {
        gl.deleteTexture(texture_sun);
        texture_sun = null;
    }
    if(vbo_texture_earth)
    {
        gl.deleteBuffer(vbo_texture_earth);
        vbo_texture_earth = null;
    }
    if(texture_earth)
    {
        gl.deleteTexture(texture_earth);
        texture_earth = null;
    }
    if(vbo_texture_moon)
    {
        gl.deleteBuffer(vbo_texture_moon);
        vbo_texture_moon = null;
    }
    if(texture_moon)
    {
        gl.deleteTexture(texture_moon);
        texture_moon = null;
    }
    if(vbo_texture_cosmos)
    {
        gl.deleteBuffer(vbo_texture_cosmos);
        vbo_texture_cosmos = null;
    }
    if(texture_cosmos)
    {
        gl.deleteTexture(texture_cosmos);
        texture_cosmos = null;
    }

    if(shaderProgramObject)
    {
        if(fragmentShaderObject)
        {
            gl.detachShader(shaderProgramObject, fragmentShaderObject); 
            gl.deleteShader (fragmentShaderObject); 
            fragmentShaderObject=null;
        }
            
        if(vertexShaderObject)
        {
            gl.detachShader(shaderProgramObject, vertexShaderObject); 
            gl.deleteShader(vertexShaderObject); 
            vertexShaderObject=null;
        }
        gl.deleteProgram(shaderProgramObject); 
        shaderProgramObject=null;
    }
}

function keyDown(event) {
    // code 
    switch (event.keyCode) {
        case 70: // for 'F' or 'f' 
            toggleFullscreen();
            break;

        case 27: // Escape 
            // uninitialize 
            uninitialize();
            // close our application's tab 
            window.close(); // may not work in Firefox but works in Safari and chrome
			window.location.replace("about:blank"); // removes history from session, so no navigation on back button
            break;
    }
    switch (event.key) {
        case 'Y':
            year = (year + 5) % 360;
            break;

        case 'y':
            year = (year - 5) % 360;
            break;

        case 'D':
            day = (day + 10) % 360;
            break;

        case 'd':
            day = (day - 10) % 360;
            break;

        // Log
        case 'l':
            console.log(cameraY);
            console.log(cameraZ);
            break;

        // Play or Pause
        case 'p':
            play = !play;
            break;

        default:
            break;
    }
}

function mouseDown() {
}

function degToRad(degrees){
    // code 
    return(degrees * Math.PI / 180.0);
} 

function showScene2(){
    document.getElementById("audS1").pause();
    document.getElementById("audS2S3").play();
    var myContainer = document.getElementById('myContainer');
    myContainer.innerHTML = '<iframe id="scene2" name="scene2" width="800" height="600" scrolling="no" frameborder="0" src="../scene2/Canvas.html"></iframe>';
}

function showScene1(){
    var myContainer = document.getElementById('myContainer');
    myContainer.innerHTML = '<canvas id="AMC" width="800" height="600">Your Browser Does Not Support HTML5 Canvas Element</canvas>';
}
