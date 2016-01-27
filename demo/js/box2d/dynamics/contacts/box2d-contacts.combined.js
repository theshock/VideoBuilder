/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2ContactNode = Class.create();
b2ContactNode.prototype = 
{
	other: null,
	contact: null,
	prev: null,
	next: null,
	initialize: function() {}};



/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





//typedef b2Contact* b2ContactCreateFcn(b2Shape* shape1, b2Shape* shape2, b2BlockAllocator* allocator);
//typedef void b2ContactDestroyFcn(b2Contact* contact, b2BlockAllocator* allocator);



var b2Contact = Class.create();
b2Contact.prototype = 
{
	GetManifolds: function(){return null},
	GetManifoldCount: function()
	{
		return this.m_manifoldCount;
	},

	GetNext: function(){
		return this.m_next;
	},

	GetShape1: function(){
		return this.m_shape1;
	},

	GetShape2: function(){
		return this.m_shape2;
	},

	//--------------- Internals Below -------------------

	// this.m_flags
	// enum


	initialize: function(s1, s2)
	{
		// initialize instance variables for references
		this.m_node1 = new b2ContactNode();
		this.m_node2 = new b2ContactNode();
		//

		this.m_flags = 0;

		if (!s1 || !s2){
			this.m_shape1 = null;
			this.m_shape2 = null;
			return;
		}

		this.m_shape1 = s1;
		this.m_shape2 = s2;

		this.m_manifoldCount = 0;

		this.m_friction = Math.sqrt(this.m_shape1.m_friction * this.m_shape2.m_friction);
		this.m_restitution = b2Math.b2Max(this.m_shape1.m_restitution, this.m_shape2.m_restitution);

		this.m_prev = null;
		this.m_next = null;

		this.m_node1.contact = null;
		this.m_node1.prev = null;
		this.m_node1.next = null;
		this.m_node1.other = null;

		this.m_node2.contact = null;
		this.m_node2.prev = null;
		this.m_node2.next = null;
		this.m_node2.other = null;
	},

	//virtual ~b2Contact() {}

	Evaluate: function(){},

	m_flags: 0,

	// World pool and list pointers.
	m_prev: null,
	m_next: null,

	// Nodes for connecting bodies.
	m_node1: new b2ContactNode(),
	m_node2: new b2ContactNode(),

	m_shape1: null,
	m_shape2: null,

	m_manifoldCount: 0,

	// Combined friction
	m_friction: null,
	m_restitution: null};
b2Contact.e_islandFlag = 0x0001;
b2Contact.e_destroyFlag = 0x0002;
b2Contact.AddType = function(createFcn, destroyFcn, type1, type2)
	{
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type1 && type1 < b2Shape.e_shapeTypeCount);
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type2 && type2 < b2Shape.e_shapeTypeCount);

		b2Contact.s_registers[type1][type2].createFcn = createFcn;
		b2Contact.s_registers[type1][type2].destroyFcn = destroyFcn;
		b2Contact.s_registers[type1][type2].primary = true;

		if (type1 != type2)
		{
			b2Contact.s_registers[type2][type1].createFcn = createFcn;
			b2Contact.s_registers[type2][type1].destroyFcn = destroyFcn;
			b2Contact.s_registers[type2][type1].primary = false;
		}
	};
b2Contact.InitializeRegisters = function(){
		b2Contact.s_registers = new Array(b2Shape.e_shapeTypeCount);
		for (var i = 0; i < b2Shape.e_shapeTypeCount; i++){
			b2Contact.s_registers[i] = new Array(b2Shape.e_shapeTypeCount);
			for (var j = 0; j < b2Shape.e_shapeTypeCount; j++){
				b2Contact.s_registers[i][j] = new b2ContactRegister();
			}
		}

		b2Contact.AddType(b2CircleContact.Create, b2CircleContact.Destroy, b2Shape.e_circleShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolyAndCircleContact.Create, b2PolyAndCircleContact.Destroy, b2Shape.e_polyShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolyContact.Create, b2PolyContact.Destroy, b2Shape.e_polyShape, b2Shape.e_polyShape);

	};
b2Contact.Create = function(shape1, shape2, allocator){
		if (b2Contact.s_initialized == false)
		{
			b2Contact.InitializeRegisters();
			b2Contact.s_initialized = true;
		}

		var type1 = shape1.m_type;
		var type2 = shape2.m_type;

		//b2Settings.b2Assert(b2Shape.e_unknownShape < type1 && type1 < b2Shape.e_shapeTypeCount);
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type2 && type2 < b2Shape.e_shapeTypeCount);

		var createFcn = b2Contact.s_registers[type1][type2].createFcn;
		if (createFcn)
		{
			if (b2Contact.s_registers[type1][type2].primary)
			{
				return createFcn(shape1, shape2, allocator);
			}
			else
			{
				var c = createFcn(shape2, shape1, allocator);
				for (var i = 0; i < c.GetManifoldCount(); ++i)
				{
					var m = c.GetManifolds()[ i ];
					m.normal = m.normal.Negative();
				}
				return c;
			}
		}
		else
		{
			return null;
		}
	};
b2Contact.Destroy = function(contact, allocator){
		//b2Settings.b2Assert(b2Contact.s_initialized == true);

		if (contact.GetManifoldCount() > 0)
		{
			contact.m_shape1.m_body.WakeUp();
			contact.m_shape2.m_body.WakeUp();
		}

		var type1 = contact.m_shape1.m_type;
		var type2 = contact.m_shape2.m_type;

		//b2Settings.b2Assert(b2Shape.e_unknownShape < type1 && type1 < b2Shape.e_shapeTypeCount);
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type2 && type2 < b2Shape.e_shapeTypeCount);

		var destroyFcn = b2Contact.s_registers[type1][type2].destroyFcn;
		destroyFcn(contact, allocator);
	};
b2Contact.s_registers = null;
b2Contact.s_initialized = false;
/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2ContactConstraint = Class.create();
b2ContactConstraint.prototype = 
{
	initialize: function(){
		// initialize instance variables for references
		this.normal = new b2Vec2();
		//

		this.points = new Array(b2Settings.b2_maxManifoldPoints);
		for (var i = 0; i < b2Settings.b2_maxManifoldPoints; i++){
			this.points[i] = new b2ContactConstraintPoint();
		}


	},
	points: null,
	normal: new b2Vec2(),
	manifold: null,
	body1: null,
	body2: null,
	friction: null,
	restitution: null,
	pointCount: 0};
/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2ContactConstraintPoint = Class.create();
b2ContactConstraintPoint.prototype = 
{
	localAnchor1: new b2Vec2(),
	localAnchor2: new b2Vec2(),
	normalImpulse: null,
	tangentImpulse: null,
	positionImpulse: null,
	normalMass: null,
	tangentMass: null,
	separation: null,
	velocityBias: null,
	initialize: function() {
		// initialize instance variables for references
		this.localAnchor1 = new b2Vec2();
		this.localAnchor2 = new b2Vec2();
		//
}};
/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/



var b2ContactRegister = Class.create();
b2ContactRegister.prototype = 
{
	createFcn: null,
	destroyFcn: null,
	primary: null,
	initialize: function() {}};



/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2ContactSolver = Class.create();
b2ContactSolver.prototype = 
{
	initialize: function(contacts, contactCount, allocator){
		// initialize instance variables for references
		this.m_constraints = new Array();
		//

		this.m_allocator = allocator;

		var i = 0;
		var tVec;
		var tMat;

		this.m_constraintCount = 0;
		for (i = 0; i < contactCount; ++i)
		{
			this.m_constraintCount += contacts[i].GetManifoldCount();
		}

		// fill array
		for (i = 0; i < this.m_constraintCount; i++){
			this.m_constraints[i] = new b2ContactConstraint();
		}

		var count = 0;
		for (i = 0; i < contactCount; ++i)
		{
			var contact = contacts[i];
			var b1 = contact.m_shape1.m_body;
			var b2 = contact.m_shape2.m_body;
			var manifoldCount = contact.GetManifoldCount();
			var manifolds = contact.GetManifolds();
			var friction = contact.m_friction;
			var restitution = contact.m_restitution;

			//var v1 = b1.m_linearVelocity.Copy();
			var v1X = b1.m_linearVelocity.x;
			var v1Y = b1.m_linearVelocity.y;
			//var v2 = b2.m_linearVelocity.Copy();
			var v2X = b2.m_linearVelocity.x;
			var v2Y = b2.m_linearVelocity.y;
			var w1 = b1.m_angularVelocity;
			var w2 = b2.m_angularVelocity;

			for (var j = 0; j < manifoldCount; ++j)
			{
				var manifold = manifolds[ j ];

				//b2Settings.b2Assert(manifold.pointCount > 0);

				//var normal = manifold.normal.Copy();
				var normalX = manifold.normal.x;
				var normalY = manifold.normal.y;

				//b2Settings.b2Assert(count < this.m_constraintCount);
				var c = this.m_constraints[ count ];
				c.body1 = b1;
				c.body2 = b2;
				c.manifold = manifold;
				//c.normal = normal;
				c.normal.x = normalX;
				c.normal.y = normalY;
				c.pointCount = manifold.pointCount;
				c.friction = friction;
				c.restitution = restitution;

				for (var k = 0; k < c.pointCount; ++k)
				{
					var cp = manifold.points[ k ];
					var ccp = c.points[ k ];

					ccp.normalImpulse = cp.normalImpulse;
					ccp.tangentImpulse = cp.tangentImpulse;
					ccp.separation = cp.separation;

					//var r1 = b2Math.SubtractVV( cp.position, b1.m_position );
					var r1X = cp.position.x - b1.m_position.x;
					var r1Y = cp.position.y - b1.m_position.y;
					//var r2 = b2Math.SubtractVV( cp.position, b2.m_position );
					var r2X = cp.position.x - b2.m_position.x;
					var r2Y = cp.position.y - b2.m_position.y;

					//ccp.localAnchor1 = b2Math.b2MulTMV(b1.m_R, r1);
					tVec = ccp.localAnchor1;
					tMat = b1.m_R;
					tVec.x = r1X * tMat.col1.x + r1Y * tMat.col1.y;
					tVec.y = r1X * tMat.col2.x + r1Y * tMat.col2.y;

					//ccp.localAnchor2 = b2Math.b2MulTMV(b2.m_R, r2);
					tVec = ccp.localAnchor2;
					tMat = b2.m_R;
					tVec.x = r2X * tMat.col1.x + r2Y * tMat.col1.y;
					tVec.y = r2X * tMat.col2.x + r2Y * tMat.col2.y;

					var r1Sqr = r1X * r1X + r1Y * r1Y;
					var r2Sqr = r2X * r2X + r2Y * r2Y;

					//var rn1 = b2Math.b2Dot(r1, normal);
					var rn1 = r1X*normalX + r1Y*normalY;
					//var rn2 = b2Math.b2Dot(r2, normal);
					var rn2 = r2X*normalX + r2Y*normalY;
					var kNormal = b1.m_invMass + b2.m_invMass;
					kNormal += b1.m_invI * (r1Sqr - rn1 * rn1) + b2.m_invI * (r2Sqr - rn2 * rn2);
					//b2Settings.b2Assert(kNormal > Number.MIN_VALUE);
					ccp.normalMass = 1.0 / kNormal;

					//var tangent = b2Math.b2CrossVF(normal, 1.0);
					var tangentX = normalY
					var tangentY = -normalX;

					//var rt1 = b2Math.b2Dot(r1, tangent);
					var rt1 = r1X*tangentX + r1Y*tangentY;
					//var rt2 = b2Math.b2Dot(r2, tangent);
					var rt2 = r2X*tangentX + r2Y*tangentY;
					var kTangent = b1.m_invMass + b2.m_invMass;
					kTangent += b1.m_invI * (r1Sqr - rt1 * rt1) + b2.m_invI * (r2Sqr - rt2 * rt2);
					//b2Settings.b2Assert(kTangent > Number.MIN_VALUE);
					ccp.tangentMass = 1.0 /  kTangent;

					// Setup a velocity bias for restitution.
					ccp.velocityBias = 0.0;
					if (ccp.separation > 0.0)
					{
						ccp.velocityBias = -60.0 * ccp.separation;
					}
					//var vRel = b2Math.b2Dot(c.normal, b2Math.SubtractVV( b2Math.SubtractVV( b2Math.AddVV( v2, b2Math.b2CrossFV(w2, r2)), v1 ), b2Math.b2CrossFV(w1, r1)));
					var tX = v2X + (-w2*r2Y) - v1X - (-w1*r1Y);
					var tY = v2Y + (w2*r2X) - v1Y - (w1*r1X);
					//var vRel = b2Dot(c.normal, tX/Y);
					var vRel = c.normal.x*tX + c.normal.y*tY;
					if (vRel < -b2Settings.b2_velocityThreshold)
					{
						ccp.velocityBias += -c.restitution * vRel;
					}
				}

				++count;
			}
		}

		//b2Settings.b2Assert(count == this.m_constraintCount);
	},
	//~b2ContactSolver();

	PreSolve: function(){
		var tVec;
		var tVec2;
		var tMat;

		// Warm start.
		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];

			var b1 = c.body1;
			var b2 = c.body2;
			var invMass1 = b1.m_invMass;
			var invI1 = b1.m_invI;
			var invMass2 = b2.m_invMass;
			var invI2 = b2.m_invI;
			//var normal = new b2Vec2(c.normal.x, c.normal.y);
			var normalX = c.normal.x;
			var normalY = c.normal.y;
			//var tangent = b2Math.b2CrossVF(normal, 1.0);
			var tangentX = normalY;
			var tangentY = -normalX;

			var j = 0;
			var tCount = 0;
			if (b2World.s_enableWarmStarting)
			{
				tCount = c.pointCount;
				for (j = 0; j < tCount; ++j)
				{
					var ccp = c.points[ j ];
					//var P = b2Math.AddVV( b2Math.MulFV(ccp.normalImpulse, normal), b2Math.MulFV(ccp.tangentImpulse, tangent));
					var PX = ccp.normalImpulse*normalX + ccp.tangentImpulse*tangentX;
					var PY = ccp.normalImpulse*normalY + ccp.tangentImpulse*tangentY;

					//var r1 = b2Math.b2MulMV(b1.m_R, ccp.localAnchor1);
					tMat = b1.m_R;
					tVec = ccp.localAnchor1;
					var r1X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
					var r1Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

					//var r2 = b2Math.b2MulMV(b2.m_R, ccp.localAnchor2);
					tMat = b2.m_R;
					tVec = ccp.localAnchor2;
					var r2X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
					var r2Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

					//b1.m_angularVelocity -= invI1 * b2Math.b2CrossVV(r1, P);
					b1.m_angularVelocity -= invI1 * (r1X * PY - r1Y * PX);
					//b1.m_linearVelocity.Subtract( b2Math.MulFV(invMass1, P) );
					b1.m_linearVelocity.x -= invMass1 * PX;
					b1.m_linearVelocity.y -= invMass1 * PY;
					//b2.m_angularVelocity += invI2 * b2Math.b2CrossVV(r2, P);
					b2.m_angularVelocity += invI2 * (r2X * PY - r2Y * PX);
					//b2.m_linearVelocity.Add( b2Math.MulFV(invMass2, P) );
					b2.m_linearVelocity.x += invMass2 * PX;
					b2.m_linearVelocity.y += invMass2 * PY;

					ccp.positionImpulse = 0.0;
				}
			}
			else{
				tCount = c.pointCount;
				for (j = 0; j < tCount; ++j)
				{
					var ccp2 = c.points[ j ];
					ccp2.normalImpulse = 0.0;
					ccp2.tangentImpulse = 0.0;

					ccp2.positionImpulse = 0.0;
				}
			}
		}
	},
	SolveVelocityConstraints: function(){
		var j = 0;
		var ccp;
		var r1X;
		var r1Y;
		var r2X;
		var r2Y;
		var dvX;
		var dvY;
		var lambda;
		var newImpulse;
		var PX;
		var PY;

		var tMat;
		var tVec;

		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];
			var b1 = c.body1;
			var b2 = c.body2;
			var b1_angularVelocity = b1.m_angularVelocity;
			var b1_linearVelocity = b1.m_linearVelocity;
			var b2_angularVelocity = b2.m_angularVelocity;
			var b2_linearVelocity = b2.m_linearVelocity;

			var invMass1 = b1.m_invMass;
			var invI1 = b1.m_invI;
			var invMass2 = b2.m_invMass;
			var invI2 = b2.m_invI;
			//var normal = new b2Vec2(c.normal.x, c.normal.y);
			var normalX = c.normal.x;
			var normalY = c.normal.y;
			//var tangent = b2Math.b2CrossVF(normal, 1.0);
			var tangentX = normalY;
			var tangentY = -normalX;

			// Solver normal constraints
			var tCount = c.pointCount;
			for (j = 0; j < tCount; ++j)
			{
				ccp = c.points[ j ];

				//r1 = b2Math.b2MulMV(b1.m_R, ccp.localAnchor1);
				tMat = b1.m_R;
				tVec = ccp.localAnchor1;
				r1X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y
				r1Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y
				//r2 = b2Math.b2MulMV(b2.m_R, ccp.localAnchor2);
				tMat = b2.m_R;
				tVec = ccp.localAnchor2;
				r2X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y
				r2Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y

				// Relative velocity at contact
				//var dv = b2Math.SubtractVV( b2Math.AddVV( b2.m_linearVelocity, b2Math.b2CrossFV(b2.m_angularVelocity, r2)), b2Math.SubtractVV(b1.m_linearVelocity, b2Math.b2CrossFV(b1.m_angularVelocity, r1)));
				//dv = b2Math.SubtractVV(b2Math.SubtractVV( b2Math.AddVV( b2.m_linearVelocity, b2Math.b2CrossFV(b2.m_angularVelocity, r2)), b1.m_linearVelocity), b2Math.b2CrossFV(b1.m_angularVelocity, r1));
				dvX = b2_linearVelocity.x + (-b2_angularVelocity * r2Y) - b1_linearVelocity.x - (-b1_angularVelocity * r1Y);
				dvY = b2_linearVelocity.y + (b2_angularVelocity * r2X) - b1_linearVelocity.y - (b1_angularVelocity * r1X);

				// Compute normal impulse
				//var vn = b2Math.b2Dot(dv, normal);
				var vn = dvX * normalX + dvY * normalY;
				lambda = -ccp.normalMass * (vn - ccp.velocityBias);

				// b2Clamp the accumulated impulse
				newImpulse = b2Math.b2Max(ccp.normalImpulse + lambda, 0.0);
				lambda = newImpulse - ccp.normalImpulse;

				// Apply contact impulse
				//P = b2Math.MulFV(lambda, normal);
				PX = lambda * normalX;
				PY = lambda * normalY;

				//b1.m_linearVelocity.Subtract( b2Math.MulFV( invMass1, P ) );
				b1_linearVelocity.x -= invMass1 * PX;
				b1_linearVelocity.y -= invMass1 * PY;
				b1_angularVelocity -= invI1 * (r1X * PY - r1Y * PX);

				//b2.m_linearVelocity.Add( b2Math.MulFV( invMass2, P ) );
				b2_linearVelocity.x += invMass2 * PX;
				b2_linearVelocity.y += invMass2 * PY;
				b2_angularVelocity += invI2 * (r2X * PY - r2Y * PX);

				ccp.normalImpulse = newImpulse;



				// MOVED FROM BELOW
				// Relative velocity at contact
				//var dv = b2.m_linearVelocity + b2Cross(b2.m_angularVelocity, r2) - b1.m_linearVelocity - b2Cross(b1.m_angularVelocity, r1);
				//dv =  b2Math.SubtractVV(b2Math.SubtractVV(b2Math.AddVV(b2.m_linearVelocity, b2Math.b2CrossFV(b2.m_angularVelocity, r2)), b1.m_linearVelocity), b2Math.b2CrossFV(b1.m_angularVelocity, r1));
				dvX = b2_linearVelocity.x + (-b2_angularVelocity * r2Y) - b1_linearVelocity.x - (-b1_angularVelocity * r1Y);
				dvY = b2_linearVelocity.y + (b2_angularVelocity * r2X) - b1_linearVelocity.y - (b1_angularVelocity * r1X);

				// Compute tangent impulse
				var vt = dvX*tangentX + dvY*tangentY;
				lambda = ccp.tangentMass * (-vt);

				// b2Clamp the accumulated impulse
				var maxFriction = c.friction * ccp.normalImpulse;
				newImpulse = b2Math.b2Clamp(ccp.tangentImpulse + lambda, -maxFriction, maxFriction);
				lambda = newImpulse - ccp.tangentImpulse;

				// Apply contact impulse
				//P = b2Math.MulFV(lambda, tangent);
				PX = lambda * tangentX;
				PY = lambda * tangentY;

				//b1.m_linearVelocity.Subtract( b2Math.MulFV( invMass1, P ) );
				b1_linearVelocity.x -= invMass1 * PX;
				b1_linearVelocity.y -= invMass1 * PY;
				b1_angularVelocity -= invI1 * (r1X * PY - r1Y * PX);

				//b2.m_linearVelocity.Add( b2Math.MulFV( invMass2, P ) );
				b2_linearVelocity.x += invMass2 * PX;
				b2_linearVelocity.y += invMass2 * PY;
				b2_angularVelocity += invI2 * (r2X * PY - r2Y * PX);

				ccp.tangentImpulse = newImpulse;
			}



			// Solver tangent constraints
			// MOVED ABOVE FOR EFFICIENCY
			/*for (j = 0; j < tCount; ++j)
			{
				ccp = c.points[ j ];

				//r1 = b2Math.b2MulMV(b1.m_R, ccp.localAnchor1);
				tMat = b1.m_R;
				tVec = ccp.localAnchor1;
				r1X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y
				r1Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y
				//r2 = b2Math.b2MulMV(b2.m_R, ccp.localAnchor2);
				tMat = b2.m_R;
				tVec = ccp.localAnchor2;
				r2X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y
				r2Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y

				// Relative velocity at contact
				//var dv = b2.m_linearVelocity + b2Cross(b2.m_angularVelocity, r2) - b1.m_linearVelocity - b2Cross(b1.m_angularVelocity, r1);
				//dv =  b2Math.SubtractVV(b2Math.SubtractVV(b2Math.AddVV(b2.m_linearVelocity, b2Math.b2CrossFV(b2.m_angularVelocity, r2)), b1.m_linearVelocity), b2Math.b2CrossFV(b1.m_angularVelocity, r1));
				dvX = b2_linearVelocity.x + (-b2_angularVelocity * r2Y) - b1_linearVelocity.x - (-b1_angularVelocity * r1Y);
				dvY = b2_linearVelocity.y + (b2_angularVelocity * r2X) - b1_linearVelocity.y - (b1_angularVelocity * r1X);

				// Compute tangent impulse
				var vt = dvX*tangentX + dvY*tangentY;
				lambda = ccp.tangentMass * (-vt);

				// b2Clamp the accumulated impulse
				var maxFriction = c.friction * ccp.normalImpulse;
				newImpulse = b2Math.b2Clamp(ccp.tangentImpulse + lambda, -maxFriction, maxFriction);
				lambda = newImpulse - ccp.tangentImpulse;

				// Apply contact impulse
				//P = b2Math.MulFV(lambda, tangent);
				PX = lambda * tangentX;
				PY = lambda * tangentY;

				//b1.m_linearVelocity.Subtract( b2Math.MulFV( invMass1, P ) );
				b1_linearVelocity.x -= invMass1 * PX;
				b1_linearVelocity.y -= invMass1 * PY;
				b1_angularVelocity -= invI1 * (r1X * PY - r1Y * PX);

				//b2.m_linearVelocity.Add( b2Math.MulFV( invMass2, P ) );
				b2_linearVelocity.x += invMass2 * PX;
				b2_linearVelocity.y += invMass2 * PY;
				b2_angularVelocity += invI2 * (r2X * PY - r2Y * PX);

				ccp.tangentImpulse = newImpulse;
			}*/

			// Update angular velocity
			b1.m_angularVelocity = b1_angularVelocity;
			b2.m_angularVelocity = b2_angularVelocity;
		}
	},
	SolvePositionConstraints: function(beta){
		var minSeparation = 0.0;

		var tMat;
		var tVec;

		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];
			var b1 = c.body1;
			var b2 = c.body2;
			var b1_position = b1.m_position;
			var b1_rotation = b1.m_rotation;
			var b2_position = b2.m_position;
			var b2_rotation = b2.m_rotation;

			var invMass1 = b1.m_invMass;
			var invI1 = b1.m_invI;
			var invMass2 = b2.m_invMass;
			var invI2 = b2.m_invI;
			//var normal = new b2Vec2(c.normal.x, c.normal.y);
			var normalX = c.normal.x;
			var normalY = c.normal.y;
			//var tangent = b2Math.b2CrossVF(normal, 1.0);
			var tangentX = normalY;
			var tangentY = -normalX;

			// Solver normal constraints
			var tCount = c.pointCount;
			for (var j = 0; j < tCount; ++j)
			{
				var ccp = c.points[ j ];

				//r1 = b2Math.b2MulMV(b1.m_R, ccp.localAnchor1);
				tMat = b1.m_R;
				tVec = ccp.localAnchor1;
				var r1X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y
				var r1Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y
				//r2 = b2Math.b2MulMV(b2.m_R, ccp.localAnchor2);
				tMat = b2.m_R;
				tVec = ccp.localAnchor2;
				var r2X = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y
				var r2Y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y

				//var p1 = b2Math.AddVV(b1.m_position, r1);
				var p1X = b1_position.x + r1X;
				var p1Y = b1_position.y + r1Y;

				//var p2 = b2Math.AddVV(b2.m_position, r2);
				var p2X = b2_position.x + r2X;
				var p2Y = b2_position.y + r2Y;

				//var dp = b2Math.SubtractVV(p2, p1);
				var dpX = p2X - p1X;
				var dpY = p2Y - p1Y;

				// Approximate the current separation.
				//var separation = b2Math.b2Dot(dp, normal) + ccp.separation;
				var separation = (dpX*normalX + dpY*normalY) + ccp.separation;

				// Track max constraint error.
				minSeparation = b2Math.b2Min(minSeparation, separation);

				// Prevent large corrections and allow slop.
				var C = beta * b2Math.b2Clamp(separation + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0.0);

				// Compute normal impulse
				var dImpulse = -ccp.normalMass * C;

				// b2Clamp the accumulated impulse
				var impulse0 = ccp.positionImpulse;
				ccp.positionImpulse = b2Math.b2Max(impulse0 + dImpulse, 0.0);
				dImpulse = ccp.positionImpulse - impulse0;

				//var impulse = b2Math.MulFV( dImpulse, normal );
				var impulseX = dImpulse * normalX;
				var impulseY = dImpulse * normalY;

				//b1.m_position.Subtract( b2Math.MulFV( invMass1, impulse ) );
				b1_position.x -= invMass1 * impulseX;
				b1_position.y -= invMass1 * impulseY;
				b1_rotation -= invI1 * (r1X * impulseY - r1Y * impulseX);
				b1.m_R.Set(b1_rotation);

				//b2.m_position.Add( b2Math.MulFV( invMass2, impulse ) );
				b2_position.x += invMass2 * impulseX;
				b2_position.y += invMass2 * impulseY;
				b2_rotation += invI2 * (r2X * impulseY - r2Y * impulseX);
				b2.m_R.Set(b2_rotation);
			}
			// Update body rotations
			b1.m_rotation = b1_rotation;
			b2.m_rotation = b2_rotation;
		}

		return minSeparation >= -b2Settings.b2_linearSlop;
	},
	PostSolve: function(){
		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];
			var m = c.manifold;

			for (var j = 0; j < c.pointCount; ++j)
			{
				var mPoint = m.points[j];
				var cPoint = c.points[j];
				mPoint.normalImpulse = cPoint.normalImpulse;
				mPoint.tangentImpulse = cPoint.tangentImpulse;
			}
		}
	},

	m_allocator: null,
	m_constraints: new Array(),
	m_constraintCount: 0};
/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/




var b2CircleContact = Class.create();
Object.extend(b2CircleContact.prototype, b2Contact.prototype);
Object.extend(b2CircleContact.prototype, 
{

		initialize: function(s1, s2) {
		// The constructor for b2Contact
		// initialize instance variables for references
		this.m_node1 = new b2ContactNode();
		this.m_node2 = new b2ContactNode();
		//
		this.m_flags = 0;

		if (!s1 || !s2){
			this.m_shape1 = null;
			this.m_shape2 = null;
			return;
		}

		this.m_shape1 = s1;
		this.m_shape2 = s2;

		this.m_manifoldCount = 0;

		this.m_friction = Math.sqrt(this.m_shape1.m_friction * this.m_shape2.m_friction);
		this.m_restitution = b2Math.b2Max(this.m_shape1.m_restitution, this.m_shape2.m_restitution);

		this.m_prev = null;
		this.m_next = null;

		this.m_node1.contact = null;
		this.m_node1.prev = null;
		this.m_node1.next = null;
		this.m_node1.other = null;

		this.m_node2.contact = null;
		this.m_node2.prev = null;
		this.m_node2.next = null;
		this.m_node2.other = null;
		//

		// initialize instance variables for references
		this.m_manifold = [new b2Manifold()];
		//

		//super(shape1, shape2);

		//b2Settings.b2Assert(this.m_shape1.m_type == b2Shape.e_circleShape);
		//b2Settings.b2Assert(this.m_shape2.m_type == b2Shape.e_circleShape);
		this.m_manifold[0].pointCount = 0;
		this.m_manifold[0].points[0].normalImpulse = 0.0;
		this.m_manifold[0].points[0].tangentImpulse = 0.0;
	},
	//~b2CircleContact() {}

	Evaluate: function(){
		b2Collision.b2CollideCircle(this.m_manifold[0], this.m_shape1, this.m_shape2, false);

		if (this.m_manifold[0].pointCount > 0)
		{
			this.m_manifoldCount = 1;
		}
		else
		{
			this.m_manifoldCount = 0;
		}
	},

	GetManifolds: function()
	{
		return this.m_manifold;
	},

	m_manifold: [new b2Manifold()]});

b2CircleContact.Create = function(shape1, shape2, allocator){
		return new b2CircleContact(shape1, shape2);
	};
b2CircleContact.Destroy = function(contact, allocator){
		//
	};
/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2Conservative = Class.create();
b2Conservative.prototype = {

	// Temp vars



	initialize: function() {}}
b2Conservative.R1 = new b2Mat22();
b2Conservative.R2 = new b2Mat22();
b2Conservative.x1 = new b2Vec2();
b2Conservative.x2 = new b2Vec2();
b2Conservative.Conservative = function(shape1, shape2){
		var body1 = shape1.GetBody();
		var body2 = shape2.GetBody();

		//b2Vec2 v1 = body1->m_position - body1->m_position0;
		var v1X = body1.m_position.x - body1.m_position0.x;
		var v1Y = body1.m_position.y - body1.m_position0.y;
		//float32 omega1 = body1->m_rotation - body1->m_rotation0;
		var omega1 = body1.m_rotation - body1.m_rotation0;
		//b2Vec2 v2 = body2->m_position - body2->m_position0;
		var v2X = body2.m_position.x - body2.m_position0.x;
		var v2Y = body2.m_position.y - body2.m_position0.y;
		//float32 omega2 = body2->m_rotation - body2->m_rotation0;
		var omega2 = body2.m_rotation - body2.m_rotation0;

		//float32 r1 = shape1->GetMaxRadius();
		var r1 = shape1.GetMaxRadius();
		//float32 r2 = shape2->GetMaxRadius();
		var r2 = shape2.GetMaxRadius();

		//b2Vec2 p1Start = body1->m_position0;
		var p1StartX = body1.m_position0.x;
		var p1StartY = body1.m_position0.y;
		//float32 a1Start = body1->m_rotation0;
		var a1Start = body1.m_rotation0;

		//b2Vec2 p2Start = body2->m_position0;
		var p2StartX = body2.m_position0.x;
		var p2StartY = body2.m_position0.y;
		//float32 a2Start = body2->m_rotation0;
		var a2Start = body2.m_rotation0;

		//b2Vec2 p1 = p1Start;
		var p1X = p1StartX;
		var p1Y = p1StartY;
		//float32 a1 = a1Start;
		var a1 = a1Start;
		//b2Vec2 p2 = p2Start;
		var p2X = p2StartX;
		var p2Y = p2StartY;
		//float32 a2 = a2Start;
		var a2 = a2Start;

		//b2Mat22 b2Conservative.R1(a1), b2Conservative.R2(a2);
		b2Conservative.R1.Set(a1);
		b2Conservative.R2.Set(a2);

		//shape1->QuickSync(p1, b2Conservative.R1);
		shape1.QuickSync(p1, b2Conservative.R1);
		//shape2->QuickSync(p2, b2Conservative.R2);
		shape2.QuickSync(p2, b2Conservative.R2);

		//float32 s1 = 0.0f;
		var s1 = 0.0;
		//const int32 maxIterations = 10;
		var maxIterations = 10;
		//b2Vec2 d;
		var dX;
		var dY;
		//float32 invRelativeVelocity = 0.0f;
		var invRelativeVelocity = 0.0;
		//bool hit = true;
		var hit = true;
		//b2Vec2 b2Conservative.x1, b2Conservative.x2; moved to static var
		for (var iter = 0; iter < maxIterations; ++iter)
		{
			// Get the accurate distance between shapes.
			//float32 distance = b2Distance.Distance(&b2Conservative.x1, &b2Conservative.x2, shape1, shape2);
			var distance = b2Distance.Distance(b2Conservative.x1, b2Conservative.x2, shape1, shape2);
			if (distance < b2Settings.b2_linearSlop)
			{
				if (iter == 0)
				{
					hit = false;
				}
				else
				{
					hit = true;
				}
				break;
			}

			if (iter == 0)
			{
				//b2Vec2 d = b2Conservative.x2 - b2Conservative.x1;
				dX = b2Conservative.x2.x - b2Conservative.x1.x;
				dY = b2Conservative.x2.y - b2Conservative.x1.y;
				//d.Normalize();
				var dLen = Math.sqrt(dX*dX + dY*dY);
				//float32 relativeVelocity = b2Dot(d, v1 - v2) + b2Abs(omega1) * r1 + b2Abs(omega2) * r2;
				var relativeVelocity = (dX*(v1X-v2X) + dY*(v1Y - v2Y)) + Math.abs(omega1) * r1 + Math.abs(omega2) * r2;
				if (Math.abs(relativeVelocity) < Number.MIN_VALUE)
				{
					hit = false;
					break;
				}

				invRelativeVelocity = 1.0 / relativeVelocity;
			}

			// Get the conservative movement.
			//float32 ds = distance * invRelativeVelocity;
			var ds = distance * invRelativeVelocity;
			//float32 s2 = s1 + ds;
			var s2 = s1 + ds;

			if (s2 < 0.0 || 1.0 < s2)
			{
				hit = false;
				break;
			}

			if (s2 < (1.0 + 100.0 * Number.MIN_VALUE) * s1)
			{
				hit = true;
				break;
			}

			s1 = s2;

			// Move forward conservatively.
			//p1 = p1Start + s1 * v1;
			p1X = p1StartX + s1 * v1.x;
			p1Y = p1StartY + s1 * v1.y;
			//a1 = a1Start + s1 * omega1;
			a1 = a1Start + s1 * omega1;
			//p2 = p2Start + s1 * v2;
			p2X = p2StartX + s1 * v2.x;
			p2Y = p2StartY + s1 * v2.y;
			//a2 = a2Start + s1 * omega2;
			a2 = a2Start + s1 * omega2;

			b2Conservative.R1.Set(a1);
			b2Conservative.R2.Set(a2);
			shape1.QuickSync(p1, b2Conservative.R1);
			shape2.QuickSync(p2, b2Conservative.R2);
		}

		if (hit)
		{
			// Hit, move bodies to safe position and re-sync shapes.
			//b2Vec2 d = b2Conservative.x2 - b2Conservative.x1;
			dX = b2Conservative.x2.x - b2Conservative.x1.x;
			dY = b2Conservative.x2.y - b2Conservative.x1.y;
			//float32 length = d.Length();
			var length = Math.sqrt(dX*dX + dY*dY);
			if (length > FLT_EPSILON)
			{
				d *= b2_linearSlop / length;
			}

			if (body1.IsStatic())
			{
				//body1.m_position = p1;
				body1.m_position.x = p1X;
				body1.m_position.y = p1Y;
			}
			else
			{
				//body1.m_position = p1 - d;
				body1.m_position.x = p1X - dX;
				body1.m_position.y = p1Y - dY;
			}
			body1.m_rotation = a1;
			body1.m_R.Set(a1);
			body1.QuickSyncShapes();

			if (body2.IsStatic())
			{
				//body2->m_position = p2;
				body2.m_position.x = p2X;
				body2.m_position.y = p2Y;
			}
			else
			{
				//body2->m_position = p2 + d;
				body2.m_position.x = p2X + dX;
				body2.m_position.y = p2Y + dY;
			}
			//body2.m_position = p2 + d;
			body2.m_position.x = p2X + dX;
			body2.m_position.y = p2Y + dY;
			body2.m_rotation = a2;
			body2.m_R.Set(a2);
			body2.QuickSyncShapes();

			return true;
		}

		// No hit, restore shapes.
		shape1.QuickSync(body1.m_position, body1.m_R);
		shape2.QuickSync(body2.m_position, body2.m_R);
		return false;
	};
/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2NullContact = Class.create();
Object.extend(b2NullContact.prototype, b2Contact.prototype);
Object.extend(b2NullContact.prototype, 
{
		initialize: function(s1, s2) {
		// The constructor for b2Contact
		// initialize instance variables for references
		this.m_node1 = new b2ContactNode();
		this.m_node2 = new b2ContactNode();
		//
		this.m_flags = 0;

		if (!s1 || !s2){
			this.m_shape1 = null;
			this.m_shape2 = null;
			return;
		}

		this.m_shape1 = s1;
		this.m_shape2 = s2;

		this.m_manifoldCount = 0;

		this.m_friction = Math.sqrt(this.m_shape1.m_friction * this.m_shape2.m_friction);
		this.m_restitution = b2Math.b2Max(this.m_shape1.m_restitution, this.m_shape2.m_restitution);

		this.m_prev = null;
		this.m_next = null;

		this.m_node1.contact = null;
		this.m_node1.prev = null;
		this.m_node1.next = null;
		this.m_node1.other = null;

		this.m_node2.contact = null;
		this.m_node2.prev = null;
		this.m_node2.next = null;
		this.m_node2.other = null;
		//
},
	Evaluate: function() {},
	GetManifolds: function(){ return null; }});

/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2PolyAndCircleContact = Class.create();
Object.extend(b2PolyAndCircleContact.prototype, b2Contact.prototype);
Object.extend(b2PolyAndCircleContact.prototype, {


		initialize: function(s1, s2) {
		// The constructor for b2Contact
		// initialize instance variables for references
		this.m_node1 = new b2ContactNode();
		this.m_node2 = new b2ContactNode();
		//
		this.m_flags = 0;

		if (!s1 || !s2){
			this.m_shape1 = null;
			this.m_shape2 = null;
			return;
		}

		this.m_shape1 = s1;
		this.m_shape2 = s2;

		this.m_manifoldCount = 0;

		this.m_friction = Math.sqrt(this.m_shape1.m_friction * this.m_shape2.m_friction);
		this.m_restitution = b2Math.b2Max(this.m_shape1.m_restitution, this.m_shape2.m_restitution);

		this.m_prev = null;
		this.m_next = null;

		this.m_node1.contact = null;
		this.m_node1.prev = null;
		this.m_node1.next = null;
		this.m_node1.other = null;

		this.m_node2.contact = null;
		this.m_node2.prev = null;
		this.m_node2.next = null;
		this.m_node2.other = null;
		//

		// initialize instance variables for references
		this.m_manifold = [new b2Manifold()];
		//

		//super(shape1, shape2);

		b2Settings.b2Assert(this.m_shape1.m_type == b2Shape.e_polyShape);
		b2Settings.b2Assert(this.m_shape2.m_type == b2Shape.e_circleShape);
		this.m_manifold[0].pointCount = 0;
		this.m_manifold[0].points[0].normalImpulse = 0.0;
		this.m_manifold[0].points[0].tangentImpulse = 0.0;
	},
	//~b2PolyAndCircleContact() {}

	Evaluate: function(){
		b2Collision.b2CollidePolyAndCircle(this.m_manifold[0], this.m_shape1, this.m_shape2, false);

		if (this.m_manifold[0].pointCount > 0)
		{
			this.m_manifoldCount = 1;
		}
		else
		{
			this.m_manifoldCount = 0;
		}
	},

	GetManifolds: function()
	{
		return this.m_manifold;
	},

	m_manifold: [new b2Manifold()]})

b2PolyAndCircleContact.Create = function(shape1, shape2, allocator){
		return new b2PolyAndCircleContact(shape1, shape2);
	};
b2PolyAndCircleContact.Destroy = function(contact, allocator){
		//
	};
/*
* Copyright (c) 2006-2007 Erin Catto http:
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked, and must not be
* misrepresented the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/





var b2PolyContact = Class.create();
Object.extend(b2PolyContact.prototype, b2Contact.prototype);
Object.extend(b2PolyContact.prototype, 
{

		initialize: function(s1, s2) {
		// The constructor for b2Contact
		// initialize instance variables for references
		this.m_node1 = new b2ContactNode();
		this.m_node2 = new b2ContactNode();
		//
		this.m_flags = 0;

		if (!s1 || !s2){
			this.m_shape1 = null;
			this.m_shape2 = null;
			return;
		}

		this.m_shape1 = s1;
		this.m_shape2 = s2;

		this.m_manifoldCount = 0;

		this.m_friction = Math.sqrt(this.m_shape1.m_friction * this.m_shape2.m_friction);
		this.m_restitution = b2Math.b2Max(this.m_shape1.m_restitution, this.m_shape2.m_restitution);

		this.m_prev = null;
		this.m_next = null;

		this.m_node1.contact = null;
		this.m_node1.prev = null;
		this.m_node1.next = null;
		this.m_node1.other = null;

		this.m_node2.contact = null;
		this.m_node2.prev = null;
		this.m_node2.next = null;
		this.m_node2.other = null;
		//

		// initialize instance variables for references
		this.m0 = new b2Manifold();
		this.m_manifold = [new b2Manifold()];
		//

		//super(shape1, shape2);
		//b2Settings.b2Assert(this.m_shape1.m_type == b2Shape.e_polyShape);
		//b2Settings.b2Assert(this.m_shape2.m_type == b2Shape.e_polyShape);
		this.m_manifold[0].pointCount = 0;
	},
	//~b2PolyContact() {}

	// store temp manifold to reduce calls to new
	m0: new b2Manifold(),

	Evaluate: function(){
		var tMani = this.m_manifold[0];
		// replace memcpy
		// memcpy(&this.m0, &this.m_manifold, sizeof(b2Manifold));
		//this.m0.points = new Array(tMani.pointCount);
		var tPoints = this.m0.points;

		for (var k = 0; k < tMani.pointCount; k++){
			var tPoint = tPoints[k];
			var tPoint0 = tMani.points[k];
			//tPoint.separation = tPoint0.separation;
			tPoint.normalImpulse = tPoint0.normalImpulse;
			tPoint.tangentImpulse = tPoint0.tangentImpulse;
			//tPoint.position.SetV( tPoint0.position );

			tPoint.id = tPoint0.id.Copy();

			/*this.m0.points[k].id.features = new Features();
			this.m0.points[k].id.features.referenceFace = this.m_manifold[0].points[k].id.features.referenceFace;
			this.m0.points[k].id.features.incidentEdge = this.m_manifold[0].points[k].id.features.incidentEdge;
			this.m0.points[k].id.features.incidentVertex = this.m_manifold[0].points[k].id.features.incidentVertex;
			this.m0.points[k].id.features.flip = this.m_manifold[0].points[k].id.features.flip;*/
		}
		//this.m0.normal.SetV( tMani.normal );
		this.m0.pointCount = tMani.pointCount;

		b2Collision.b2CollidePoly(tMani, this.m_shape1, this.m_shape2, false);

		// Match contact ids to facilitate warm starting.
		if (tMani.pointCount > 0)
		{
			var match = [false, false];

			// Match old contact ids to new contact ids and copy the
			// stored impulses to warm start the solver.
			for (var i = 0; i < tMani.pointCount; ++i)
			{
				var cp = tMani.points[ i ];

				cp.normalImpulse = 0.0;
				cp.tangentImpulse = 0.0;
				var idKey = cp.id.key;

				for (var j = 0; j < this.m0.pointCount; ++j)
				{

					if (match[j] == true)
						continue;

					var cp0 = this.m0.points[j];
					var id0 = cp0.id;

					if (id0.key == idKey)
					{
						match[j] = true;
						cp.normalImpulse = cp0.normalImpulse;
						cp.tangentImpulse = cp0.tangentImpulse;
						break;
					}
				}
			}

			this.m_manifoldCount = 1;
		}
		else
		{
			this.m_manifoldCount = 0;
		}
	},

	GetManifolds: function()
	{
		return this.m_manifold;
	},

	m_manifold: [new b2Manifold()]});

b2PolyContact.Create = function(shape1, shape2, allocator){
		//void* mem = allocator->Allocate(sizeof(b2PolyContact));
		return new b2PolyContact(shape1, shape2);
	};
b2PolyContact.Destroy = function(contact, allocator){
		//((b2PolyContact*)contact)->~b2PolyContact();
		//allocator->Free(contact, sizeof(b2PolyContact));
	};
