"""Author FORM's original continuous neutral-pose surface. No external assets.
Requires numpy and scikit-image. Usage: python scripts/sculpt-athlete.py /tmp/form-surface.json
"""
import json, sys
import numpy as np
from skimage.measure import marching_cubes

step=.024
origin=np.array([-1.31,-1.18,-.27])
axes=[np.arange(a,b+step,step) for a,b in zip(origin,[1.31,1.30,.29])]
X,Y,Z=np.meshgrid(*axes,indexing='ij')
field=np.full(X.shape,10.)
def ellipsoid(center,size,k=.032):
 global field
 d=(np.sqrt(((X-center[0])/size[0])**2+((Y-center[1])/size[1])**2+((Z-center[2])/size[2])**2)-1)*min(size)
 h=np.maximum(k-np.abs(field-d),0)/k
 field=np.minimum(field,d)-h*h*k*.25

# Sculpted shirt, pelvis, clavicle transition, neck and head are one surface.
ellipsoid([0,.30,0],[.25,.38,.15])
ellipsoid([0,.59,.015],[.32,.24,.174])
ellipsoid([0,-.025,0],[.26,.175,.172])
for s in [-1,1]:
 ellipsoid([s*.148,.615,.115],[.163,.128,.081])
 ellipsoid([s*.16,.754,-.005],[.19,.091,.115])
ellipsoid([0,.86,0],[.085,.14,.087])
ellipsoid([0,1.078,-.003],[.131,.174,.126])
ellipsoid([0,1.005,.025],[.102,.112,.101])
for s in [-1,1]:
 ellipsoid([s*.347,.8,0],[.151,.135,.136])
 ellipsoid([s*.54,.8,0],[.22,.104,.102])
 ellipsoid([s*.78,.8,0],[.09,.075,.074])
 ellipsoid([s*.964,.8,.005],[.197,.076,.078])
 ellipsoid([s*1.145,.8,0],[.11,.050,.051])
 ellipsoid([s*.17,-.242,0],[.129,.31,.139])
 ellipsoid([s*.17,-.532,0],[.086,.105,.087])
 ellipsoid([s*.17,-.734,-.007],[.088,.225,.096])
 ellipsoid([s*.17,-.995,0],[.048,.134,.056])

verts,faces,normals,_=marching_cubes(field,level=0,spacing=(step,step,step),gradient_direction='ascent')
verts+=origin
# Recalculate outward normals from the scalar field to keep smooth-union joins.
gx,gy,gz=np.gradient(field,step)
from scipy.ndimage import map_coordinates
coords=((verts-origin)/step).T
normals=np.column_stack([map_coordinates(g,coords,order=1) for g in [gx,gy,gz]])
normals/=np.linalg.norm(normals,axis=1)[:,None]
cross=np.cross(verts[faces[:,1]]-verts[faces[:,0]],verts[faces[:,2]]-verts[faces[:,0]])
flip=(cross*normals[faces[:,0]]).sum(axis=1)<0
faces[flip]=faces[flip][:,[0,2,1]]
with open(sys.argv[1],'w') as f: json.dump({'positions':verts.round(6).ravel().tolist(),'normals':normals.round(6).ravel().tolist(),'indices':faces.ravel().tolist()},f,separators=(',',':'))
print(f'Original sculpt: {len(verts)} vertices, {len(faces)} triangles')
