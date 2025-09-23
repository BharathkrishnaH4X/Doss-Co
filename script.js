const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');

function setStatus(msg, isError=false){
  statusDiv.textContent = msg;
  statusDiv.style.color = isError ? "red" : "black";
}

async function requestMedia(){
  try{
    setStatus("Requesting camera & mic...");
    return await navigator.mediaDevices.getUserMedia({video:true,audio:true});
  }catch(e){
    setStatus("Camera/Mic denied.", true);
    throw e;
  }
}

function captureImage(video){
  const canvas=document.createElement("canvas");
  canvas.width=video.videoWidth||640;
  canvas.height=video.videoHeight||480;
  canvas.getContext("2d").drawImage(video,0,0);
  return new Promise(res=>canvas.toBlob(res,"image/png"));
}

function recordAudio(stream,duration=3000){
  return new Promise(res=>{
    const rec=new MediaRecorder(stream);
    const chunks=[];
    rec.ondataavailable=e=>chunks.push(e.data);
    rec.onstop=()=>res(new Blob(chunks,{type:"audio/webm"}));
    rec.start();
    setTimeout(()=>rec.stop(),duration);
  });
}

function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

async function getLocation(){
  return new Promise((res,rej)=>{
    if(!navigator.geolocation) return rej("No GPS");
    navigator.geolocation.getCurrentPosition(
      pos=>res(pos.coords),
      err=>rej(err.message)
    );
  });
}

downloadBtn.onclick=async()=>{
  setStatus("Starting capture...");
  let stream;
  try{ stream=await requestMedia(); }
  catch{ return; }

  const video=document.createElement("video");
  video.srcObject=stream;
  await video.play().catch(()=>{});
  await new Promise(r=>setTimeout(r,1500));

  setStatus("Capturing photo & audio...");
  const img=await captureImage(video);
  const audio=await recordAudio(stream,3000);

  let coordsTxt="Location denied";
  try{
    const coords=await getLocation();
    coordsTxt=`Latitude:${coords.latitude}, Longitude:${coords.longitude}`;
  }catch{}

  stream.getTracks().forEach(t=>t.stop());

  downloadBlob(img,"snapshot.png");
  downloadBlob(audio,"audio.webm");
  downloadBlob(new Blob([coordsTxt],{type:"text/plain"}),"location.txt");

  setStatus("Done! Files downloaded.");
};
