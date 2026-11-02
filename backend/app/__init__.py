import starlette.routing
import starlette.applications

# Compatibility shim: Starlette 1.x removed on_startup / on_shutdown
# from Router.__init__, but FastAPI <= 0.111.0 still expects them as arguments
# and accesses router.on_startup / router.on_shutdown in include_router.
_orig_router_init = starlette.routing.Router.__init__

def _compat_router_init(self, *args, on_startup=None, on_shutdown=None, **kwargs):
    res = _orig_router_init(self, *args, **kwargs)
    if not hasattr(self, "on_startup"):
        self.on_startup = [] if on_startup is None else list(on_startup)
    if not hasattr(self, "on_shutdown"):
        self.on_shutdown = [] if on_shutdown is None else list(on_shutdown)
    return res

starlette.routing.Router.__init__ = _compat_router_init

# In Starlette 1.x, build_middleware_stack checks self.max_body_size which
# FastAPI <= 0.111.0 does not set on Starlette instance.
if not hasattr(starlette.applications.Starlette, "max_body_size"):
    starlette.applications.Starlette.max_body_size = None
